// Icon Font Awesome cho từng kỹ năng và mẫu cảnh của khu vực (khớp danh sách cố định trong @lw/shared).
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBook,
  faBookOpen,
  faBookOpenReader,
  faComments,
  faEnvelope,
  faFilm,
  faHeadphones,
  faHouseChimney,
  faMugHot,
  faPenNib,
  faPeopleGroup,
  faSchool,
  faSignsPost,
  faSpellCheck,
  faStore,
  faTractor,
  faTree,
} from "@fortawesome/free-solid-svg-icons";
import type { AreaScene, Skill } from "@lw/shared";

export const SKILL_ICONS: Record<Skill, IconDefinition> = {
  vocabulary: faBook,
  listening: faHeadphones,
  conversation: faComments,
  reading: faBookOpen,
  writing: faPenNib,
  grammar: faSpellCheck,
  directions: faSignsPost,
  group_talk: faPeopleGroup,
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
