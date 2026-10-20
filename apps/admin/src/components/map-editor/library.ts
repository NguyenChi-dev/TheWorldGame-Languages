import {
  faBox,
  faBucket,
  faChair,
  faCircle,
  faCube,
  faDatabase,
  faGripLinesVertical,
  faHouse,
  faLightbulb,
  faMountain,
  faRoad,
  faSeedling,
  faSpa,
  faStore,
  faTree,
  faWater,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import {
  PREFAB_KEYS,
  PREFABS,
  type MapObject,
  type MapVector,
  type PrefabCategory,
  type PrefabKey,
  type PrimitiveKind,
} from "@lw/shared/map-layout";

/** Nhóm trong thư viện: 3 nhóm mẫu low-poly + khối cơ bản + mô hình GLB của người dùng. */
export type LibraryGroup = PrefabCategory | "primitive" | "model";
export const LIBRARY_GROUPS: { key: LibraryGroup | "all"; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "nature", label: "Thiên nhiên" },
  { key: "street", label: "Đường phố" },
  { key: "building", label: "Nhà cửa" },
  { key: "primitive", label: "Khối" },
  { key: "model", label: "GLB" },
];

export interface LibraryItem {
  id: string;
  group: LibraryGroup;
  name: string;
  /** Màu mặc định (null: mô hình GLB, không đổi màu được). */
  color: string | null;
  icon: IconDefinition;
  /** Gợi ý ngắn hiện khi rê chuột. */
  hint: string;
  /** Khoảng cách gợi ý giữa 2 vật khi rải bằng cọ (mét). */
  spacing: number;
  create: (base: BaseObject, color: string | null) => MapObject;
}

export type BaseObject = {
  id: string;
  name: string;
  position: MapVector;
  rotation: MapVector;
  scale: MapVector;
  visible: boolean;
  locked: boolean;
};

const PREFAB_ICONS: Record<PrefabKey, IconDefinition> = {
  tree: faTree,
  pine: faTree,
  bush: faSeedling,
  flowers: faSpa,
  rock: faMountain,
  path: faRoad,
  pond: faWater,
  lamp: faLightbulb,
  bench: faChair,
  fence: faGripLinesVertical,
  house: faHouse,
  stall: faStore,
  well: faBucket,
  barrel: faDatabase,
};
const PREFAB_HINTS: Record<PrefabKey, string> = {
  tree: "Cao ~3 m. Dùng cọ để trồng cả khu rừng",
  pine: "Cao ~4 m, hợp rìa bản đồ",
  bush: "Bụi thấp có hoa",
  flowers: "Luống hoa 2 x 1 m",
  rock: "Tảng đá 2 m",
  path: "Ô lát đá 2 x 2 m, đặt liền nhau thành đường",
  pond: "Hồ tròn đường kính ~4 m",
  lamp: "Đèn cổ có cờ xanh, cao 3,6 m",
  bench: "Ghế dài 1,7 m",
  fence: "Đoạn rào 2 m, xoay 90° để rẽ",
  house: "Nhà 3,4 x 4 m, màu = màu tường",
  stall: "Quầy chợ có mái sọc, màu = màu mái",
  well: "Giếng có mái che",
  barrel: "Thùng tô-nô + hộp gỗ",
};
/** Cọ rải: khoảng cách hợp lý theo kích thước mẫu. */
const PREFAB_SPACING: Partial<Record<PrefabKey, number>> = { path: 2, fence: 2, house: 6, pond: 5, stall: 4 };

export const PREFAB_ITEMS: LibraryItem[] = PREFAB_KEYS.map((key) => ({
  id: `prefab:${key}`,
  group: PREFABS[key].category,
  name: PREFABS[key].name,
  color: PREFABS[key].color,
  icon: PREFAB_ICONS[key],
  hint: PREFAB_HINTS[key],
  spacing: PREFAB_SPACING[key] ?? 2.5,
  create: (base, color) => ({ ...base, kind: "prefab", prefab: key, color: color ?? PREFABS[key].color }),
}));

const PRIMITIVES: { kind: PrimitiveKind; name: string; color: string; icon: IconDefinition }[] = [
  { kind: "box", name: "Khối hộp", color: "#c7a681", icon: faBox },
  { kind: "cylinder", name: "Khối trụ", color: "#bba8cf", icon: faDatabase },
  { kind: "sphere", name: "Khối cầu", color: "#82b8a0", icon: faCircle },
];
export const PRIMITIVE_ITEMS: LibraryItem[] = PRIMITIVES.map((item) => ({
  id: `primitive:${item.kind}`,
  group: "primitive",
  name: item.name,
  color: item.color,
  icon: item.icon,
  hint: "Khối 3 m để phác bố cục",
  spacing: 3.5,
  create: (base, color) => ({
    ...base,
    kind: item.kind,
    color: color ?? item.color,
    scale: { x: 3 * base.scale.x, y: 3 * base.scale.y, z: 3 * base.scale.z },
  }),
}));

export function modelItem(source: string, file: File): LibraryItem {
  const name =
    file.name
      .replace(/\.glb$/i, "")
      .trim()
      .slice(0, 100) || "Mô hình";
  return {
    id: `model:${source}`,
    group: "model",
    name,
    color: null,
    icon: faCube,
    hint: file.name,
    spacing: 4,
    create: (base) => ({ ...base, name, kind: "glb", source }),
  };
}
