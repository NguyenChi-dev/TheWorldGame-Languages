/**
 * Chỉnh thông tin gói lúc pnpm cài đặt.
 *
 * @colyseus/core khai báo peer (tùy chọn) tới @colyseus/ws-transport, còn ws-transport lại peer ngược
 * lại tới core. Vòng peer này làm pnpm tạo ra HAI bản @colyseus/core khác nhau: một bản cho gói
 * `colyseus` (tạo phòng, giữ chỗ), một bản cho ws-transport (nhận kết nối WebSocket). Hai bản không
 * chung dữ liệu, nên mọi lượt vào phòng đều lỗi "seat reservation expired" và game luôn "Mất kết nối".
 *
 * Bỏ peer tùy chọn core → ws-transport để chỉ còn MỘT bản @colyseus/core dùng chung.
 */
module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.name === "@colyseus/core") {
        if (pkg.peerDependencies) delete pkg.peerDependencies["@colyseus/ws-transport"];
        if (pkg.peerDependenciesMeta) delete pkg.peerDependenciesMeta["@colyseus/ws-transport"];
      }
      return pkg;
    },
  },
};
