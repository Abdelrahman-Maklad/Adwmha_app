// db/defaultData.ts

type Times = {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
};

const CP_SOUND = "adhan.mp3";

export function buildDefaultCheckpoints(times: Times, lastThirdTime: string) {
  const makeCpNotifText = (name: string) => `وقت ${name}`;

  return [
    {
      id: "cp_fajr",
      type: "checkpoint",
      name: "الفجر",
      time: times.fajr,

      locked: true,
      expanded: true,

      default: true,
      repeat_type: "daily",

      notifications: true,
      enable_disable_notifications: true,
      notification_time: times.fajr,
      notification_sound: CP_SOUND,
      notification_text: makeCpNotifText("الفجر"),

      color: "#7B6CF6",
      icon: "moon",
      image: "",
      redirect: "",

      tasks: [
        {
          id: "t_fajr_sunnah",
          type: "secondary_task",
          name: "سنة الفجر (ركعتان)",
          done: false,
          points: 5,

          default: true,
          repeat: "daily",

          notifications: false,
          enable_disable_notifications: false,
          notification_time: "",
          notification_sound: "",
          notification_text: "",

          icon: "book",
          image: "",
          redirect: "",

          checklist: []
        },
        {
          id: "t_fajr_main",
          type: "main_task",
          name: "صلاة الفجر",
          done: false,
          points: 4,

          default: true,
          repeat: "daily",

          notifications: false,
          enable_disable_notifications: false,
          notification_time: "",
          notification_sound: "",
          notification_text: "",

          icon: "pray",
          image: "",
          redirect: "",

          checklist: [
            { id: "cl_fajr_jama3a", name: "جماعة", done: false, points: 3, icon: "users", image: "", redirect: "" },
            { id: "cl_fajr_waqt", name: "في الوقت", done: false, points: 3, icon: "clock", image: "", redirect: "" },
            { id: "cl_fajr_athkar", name: "أذكار الصلاة", done: false, points: 2, icon: "heart", image: "", redirect: "" }
          ]
        },
        {
          id: "t_fajr_quran",
          type: "regular_task",
          name: "قرآن الفجر",
          done: false,
          points: 5,

          default: true,
          repeat: "daily",

          notifications: false,
          enable_disable_notifications: false,
          notification_time: "",
          notification_sound: "",
          notification_text: "",

          icon: "book",
          image: "",
          redirect: "",

          checklist: []
        }
      ]
    },

    {
      id: "cp_sunrise",
      type: "checkpoint",
      name: "الشروق",
      time: times.sunrise,

      locked: false,
      expanded: true,

      default: true,
      repeat_type: "daily",

      notifications: true,
      enable_disable_notifications: true,
      notification_time: times.sunrise,
      notification_sound: CP_SOUND,
      notification_text: makeCpNotifText("الشروق"),

      color: "#F4A261",
      icon: "sunrise",
      image: "",
      redirect: "",

      tasks: [
        {
          id: "t_sabah",
          type: "regular_task",
          name: "أذكار الصباح",
          done: false,
          points: 5,

          default: true,
          repeat: "daily",

          notifications: false,
          enable_disable_notifications: false,
          notification_time: "",
          notification_sound: "",
          notification_text: "",

          icon: "sun",
          image: "",
          redirect: "",

          checklist: []
        },
        {
          id: "t_duha",
          type: "secondary_task",
          name: "صلاة الضحى",
          done: false,
          points: 5,

          default: true,
          repeat: "daily",

          notifications: false,
          enable_disable_notifications: false,
          notification_time: "",
          notification_sound: "",
          notification_text: "",

          icon: "sun",
          image: "",
          redirect: "",

          checklist: []
        }
      ]
    },

    {
      id: "cp_dhuhr",
      type: "checkpoint",
      name: "الظهر",
      time: times.dhuhr,

      locked: true,
      expanded: true,

      default: true,
      repeat_type: "daily",

      notifications: true,
      enable_disable_notifications: true,
      notification_time: times.dhuhr,
      notification_sound: CP_SOUND,
      notification_text: makeCpNotifText("الظهر"),

      color: "#48CAE4",
      icon: "sun",
      image: "",
      redirect: "",

      tasks: [
        {
          id: "t_dhuhr_sunnah_before",
          type: "secondary_task",
          name: "سنة قبل الظهر (٤ ركعات)",
          done: false,
          points: 5,

          default: true,
          repeat: "daily",

          notifications: false,
          enable_disable_notifications: false,
          notification_time: "",
          notification_sound: "",
          notification_text: "",

          icon: "book",
          image: "",
          redirect: "",

          checklist: []
        },
        {
          id: "t_dhuhr_main",
          type: "main_task",
          name: "صلاة الظهر",
          done: false,
          points: 4,

          default: true,
          repeat: "daily",

          notifications: false,
          enable_disable_notifications: false,
          notification_time: "",
          notification_sound: "",
          notification_text: "",

          icon: "pray",
          image: "",
          redirect: "",

          checklist: [
            { id: "cl_dhuhr_jama3a", name: "جماعة", done: false, points: 3, icon: "users", image: "", redirect: "" },
            { id: "cl_dhuhr_waqt", name: "في الوقت", done: false, points: 3, icon: "clock", image: "", redirect: "" },
            { id: "cl_dhuhr_athkar", name: "أذكار الصلاة", done: false, points: 2, icon: "heart", image: "", redirect: "" }
          ]
        },
        {
          id: "t_dhuhr_sunnah_after",
          type: "secondary_task",
          name: "سنة بعد الظهر (ركعتان)",
          done: false,
          points: 5,

          default: true,
          repeat: "daily",

          notifications: false,
          enable_disable_notifications: false,
          notification_time: "",
          notification_sound: "",
          notification_text: "",

          icon: "book",
          image: "",
          redirect: "",

          checklist: []
        }
      ]
    },

    {
      id: "cp_asr",
      type: "checkpoint",
      name: "العصر",
      time: times.asr,

      locked: true,
      expanded: true,

      default: true,
      repeat_type: "daily",

      notifications: true,
      enable_disable_notifications: true,
      notification_time: times.asr,
      notification_sound: CP_SOUND,
      notification_text: makeCpNotifText("العصر"),

      color: "#90BE6D",
      icon: "cloudsun",
      image: "",
      redirect: "",

      tasks: [
        {
          id: "t_asr_main",
          type: "main_task",
          name: "صلاة العصر",
          done: false,
          points: 4,

          default: true,
          repeat: "daily",

          notifications: false,
          enable_disable_notifications: false,
          notification_time: "",
          notification_sound: "",
          notification_text: "",

          icon: "pray",
          image: "",
          redirect: "",

          checklist: [
            { id: "cl_asr_jama3a", name: "جماعة", done: false, points: 3, icon: "users", image: "", redirect: "" },
            { id: "cl_asr_waqt", name: "في الوقت", done: false, points: 3, icon: "clock", image: "", redirect: "" },
            { id: "cl_asr_athkar", name: "أذكار الصلاة", done: false, points: 2, icon: "heart", image: "", redirect: "" }
          ]
        },
        {
          id: "t_masaa",
          type: "regular_task",
          name: "أذكار المساء",
          done: false,
          points: 5,

          default: true,
          repeat: "daily",

          notifications: false,
          enable_disable_notifications: false,
          notification_time: "",
          notification_sound: "",
          notification_text: "",

          icon: "sun",
          image: "",
          redirect: "",

          checklist: []
        }
      ]
    },

    {
      id: "cp_maghrib",
      type: "checkpoint",
      name: "المغرب",
      time: times.maghrib,

      locked: true,
      expanded: true,

      default: true,
      repeat_type: "daily",

      notifications: true,
      enable_disable_notifications: true,
      notification_time: times.maghrib,
      notification_sound: CP_SOUND,
      notification_text: makeCpNotifText("المغرب"),

      color: "#F77F00",
      icon: "sunset",
      image: "",
      redirect: "",

      tasks: [
        {
          id: "t_maghrib_main",
          type: "main_task",
          name: "صلاة المغرب",
          done: false,
          points: 4,

          default: true,
          repeat: "daily",

          notifications: false,
          enable_disable_notifications: false,
          notification_time: "",
          notification_sound: "",
          notification_text: "",

          icon: "pray",
          image: "",
          redirect: "",

          checklist: [
            { id: "cl_maghrib_jama3a", name: "جماعة", done: false, points: 3, icon: "users", image: "", redirect: "" },
            { id: "cl_maghrib_waqt", name: "في الوقت", done: false, points: 3, icon: "clock", image: "", redirect: "" },
            { id: "cl_maghrib_athkar", name: "أذكار الصلاة", done: false, points: 2, icon: "heart", image: "", redirect: "" }
          ]
        },
        {
          id: "t_maghrib_sunnah",
          type: "secondary_task",
          name: "سنة بعد المغرب (ركعتان)",
          done: false,
          points: 5,

          default: true,
          repeat: "daily",

          notifications: false,
          enable_disable_notifications: false,
          notification_time: "",
          notification_sound: "",
          notification_text: "",

          icon: "book",
          image: "",
          redirect: "",

          checklist: []
        }
      ]
    },

    {
      id: "cp_isha",
      type: "checkpoint",
      name: "العشاء",
      time: times.isha,

      locked: true,
      expanded: true,

      default: true,
      repeat_type: "daily",

      notifications: true,
      enable_disable_notifications: true,
      notification_time: times.isha,
      notification_sound: CP_SOUND,
      notification_text: makeCpNotifText("العشاء"),

      color: "#9B5DE5",
      icon: "cloudmoon",
      image: "",
      redirect: "",

      tasks: [
        {
          id: "t_isha_main",
          type: "main_task",
          name: "صلاة العشاء",
          done: false,
          points: 4,

          default: true,
          repeat: "daily",

          notifications: false,
          enable_disable_notifications: false,
          notification_time: "",
          notification_sound: "",
          notification_text: "",

          icon: "pray",
          image: "",
          redirect: "",

          checklist: [
            { id: "cl_isha_jama3a", name: "جماعة", done: false, points: 3, icon: "users", image: "", redirect: "" },
            { id: "cl_isha_waqt", name: "في الوقت", done: false, points: 3, icon: "clock", image: "", redirect: "" },
            { id: "cl_isha_athkar", name: "أذكار الصلاة", done: false, points: 2, icon: "heart", image: "", redirect: "" }
          ]
        },
        {
          id: "t_isha_sunnah",
          type: "secondary_task",
          name: "سنة بعد العشاء (ركعتان)",
          done: false,
          points: 5,

          default: true,
          repeat: "daily",

          notifications: false,
          enable_disable_notifications: false,
          notification_time: "",
          notification_sound: "",
          notification_text: "",

          icon: "book",
          image: "",
          redirect: "",

          checklist: []
        }
      ]
    },

    {
      id: "cp_lastthird",
      type: "checkpoint",
      name: "الثلث الأخير من الليل",
      time: lastThirdTime,

      locked: false,
      expanded: true,

      default: true,
      repeat_type: "daily",

      notifications: true,
      enable_disable_notifications: true,
      notification_time: lastThirdTime,
      notification_sound: CP_SOUND,
      notification_text: makeCpNotifText("الثلث الأخير من الليل"),

      color: "#7B6CF6",
      icon: "star",
      image: "",
      redirect: "",

      tasks: [
        {
          id: "t_tahajjud",
          type: "secondary_task",
          name: "التهجد",
          done: false,
          points: 5,

          default: true,
          repeat: "daily",

          notifications: false,
          enable_disable_notifications: false,
          notification_time: "",
          notification_sound: "",
          notification_text: "",

          icon: "moon",
          image: "",
          redirect: "",

          checklist: []
        },
        {
          id: "t_istigfar",
          type: "regular_task",
          name: "الاستغفار بالأسحار",
          done: false,
          points: 5,

          default: true,
          repeat: "daily",

          notifications: false,
          enable_disable_notifications: false,
          notification_time: "",
          notification_sound: "",
          notification_text: "",

          icon: "star",
          image: "",
          redirect: "",

          checklist: []
        },
        {
          id: "t_suhoor",
          type: "regular_task",
          name: "السحور",
          done: false,
          points: 5,

          default: true,
          repeat: "daily",

          notifications: false,
          enable_disable_notifications: false,
          notification_time: "",
          notification_sound: "",
          notification_text: "",

          icon: "moon",
          image: "",
          redirect: "",

          checklist: []
        }
      ]
    }
  ];
}