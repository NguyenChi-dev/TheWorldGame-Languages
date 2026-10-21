-- =============================================================================
-- 0009 — XÁC THỰC HAI LỚP BẮT BUỘC CHO THAO TÁC NHẠY CẢM + CÔNG TẮC 2 LỚP CHO ADMIN
--
-- 1. Thao tác nhạy cảm (khớp AAL2_PERMISSIONS trong packages/shared/src/permissions.ts) LUÔN cần phiên
--    đã qua xác thực hai lớp (aal2), kể cả khi công tắc admin_settings.require_mfa đang TẮT:
--      - đổi vai trò (profiles UPDATE)
--      - xóa vùng đất / khu vực / kỹ năng (lands, areas, skills DELETE)
--    Trước đây database chỉ đòi aal2 khi công tắc bật, nên token aal1 của admin gọi thẳng Supabase REST
--    vẫn đổi vai trò / xóa được (trang quản trị và API đã chặn, database thì chưa).
--
-- 2. Hàm set_admin_mfa_required(boolean): admin (đã aal2) bật / tắt công tắc 2 lớp từ trang Cài đặt,
--    có ghi admin_logs. Bảng admin_settings vẫn không ai sửa trực tiếp được.
--
-- Không đổi dữ liệu, không đổi vai trò của ai. Thao tác thường (xem, tạo, sửa nội dung) không đổi.
-- =============================================================================

-- true khi phiên hiện tại đã qua xác thực hai lớp.
create function public.has_aal2()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
$$;

revoke execute on function public.has_aal2() from public, anon;
grant execute on function public.has_aal2() to authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 1. Policy của thao tác nhạy cảm: thêm điều kiện has_aal2()
-- -----------------------------------------------------------------------------

drop policy "Chỉ admin đổi vai trò của người khác" on public.profiles;
create policy "Chỉ admin đổi vai trò của người khác"
  on public.profiles for update to authenticated
  using (public.has_staff_role('{admin}') and public.has_aal2() and id <> (select auth.uid()))
  with check (public.has_staff_role('{admin}') and public.has_aal2() and id <> (select auth.uid()));

drop policy lands_delete on public.lands;
create policy lands_delete on public.lands for delete to authenticated
  using (public.has_staff_role('{admin}') and public.has_aal2());

drop policy areas_delete on public.areas;
create policy areas_delete on public.areas for delete to authenticated
  using (public.has_staff_role('{admin}') and public.has_aal2());

drop policy skills_delete on public.skills;
create policy skills_delete on public.skills for delete to authenticated
  using (public.has_staff_role('{admin}') and public.has_aal2());


-- -----------------------------------------------------------------------------
-- 2. Bật / tắt công tắc xác thực hai lớp (chỉ admin đã aal2), có ghi nhật ký
-- security definer: admin_settings không cấp quyền UPDATE cho ai; hàm tự kiểm tra người gọi.
-- -----------------------------------------------------------------------------

create function public.set_admin_mfa_required(p_required boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before boolean;
begin
  if p_required is null then
    raise exception 'Giá trị công tắc không hợp lệ' using errcode = '22004';
  end if;
  -- Đổi công tắc là thao tác nhạy cảm: luôn cần aal2, kể cả khi công tắc đang tắt.
  if not (public.has_staff_role('{admin}') and public.has_aal2()) then
    raise exception 'Chỉ admin đã xác thực hai lớp mới đổi được công tắc này'
      using errcode = 'insufficient_privilege';
  end if;

  select require_mfa into v_before from public.admin_settings where id for update;
  update public.admin_settings set require_mfa = p_required where id;

  insert into public.admin_logs (actor_id, actor_role, action, target_table, target_id, before, after)
  values (
    (select auth.uid()),
    public.current_user_role()::text,
    'admin_settings.update_require_mfa',
    'admin_settings',
    'require_mfa',
    jsonb_build_object('require_mfa', v_before),
    jsonb_build_object('require_mfa', p_required)
  );
  return p_required;
end;
$$;

revoke execute on function public.set_admin_mfa_required(boolean) from public, anon;
grant execute on function public.set_admin_mfa_required(boolean) to authenticated;
