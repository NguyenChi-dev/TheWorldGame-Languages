// Icon Font Awesome cho kỹ năng (theo mã icon admin chọn) và mẫu cảnh của khu vực (khớp danh sách cố định trong @lw/shared).
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBook,
  faBookOpen,
  faBookOpenReader,
  faComments,
  faEnvelope,
  faFilm,
  faGamepad,
  faHeadphones,
  faHouseChimney,
  faLanguage,
  faMicrophone,
  faMugHot,
  faMusic,
  faPenNib,
  faPeopleGroup,
  faPuzzlePiece,
  faSchool,
  faSignsPost,
  faSpellCheck,
  faStar,
  faStore,
  faTractor,
  faTree,
} from "@fortawesome/free-solid-svg-icons";
import type { AreaScene, SkillIconKey } from "@lw/shared";

export const SKILL_ICONS: Record<SkillIconKey, IconDefinition> = {
  book: faBook,
  "book-open": faBookOpen,
  headphones: faHeadphones,
  comments: faComments,
  microphone: faMicrophone,
  "pen-nib": faPenNib,
  "spell-check": faSpellCheck,
  "signs-post": faSignsPost,
  "people-group": faPeopleGroup,
  language: faLanguage,
  "puzzle-piece": faPuzzlePiece,
  music: faMusic,
  gamepad: faGamepad,
  star: faStar,
};

export const SCENE_ICONS: Record<AreaScene, IconDefinition> = {
  farm: faTractor,
  market: faStore,
  cinema: faFilm,
  cafe: faMugHot,
  library: faBookOpenReader,
  post_office: faEnvelope,
  school: faSchool,
  suburb: faHouseChimney,
  park: faTree,
};
