// db/schema.ts

const checklistItemSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "name", "done", "points", "icon", "image", "redirect"],
  properties: {
    id: { type: "string", maxLength: 128 },
    name: { type: "string" },
    done: { type: "boolean" },
    points: { type: "number" },

    icon: { type: "string" },   // can be "" if using image
    image: { type: "string" },  // can be "" if using icon
    redirect: { type: "string" } // link if needed
  }
} as const;

const taskSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "type",
    "name",
    "done",
    "points",
    "locked",
    "default",
    "repeat",
    "repeat_days",

    "notifications",
    "enable_disable_notifications",
    "notification_time",
    "notification_title",
    "notification_sound",
    "notification_text",

    "icon",
    "image",
    "redirect",

    "checklist"
  ],
  properties: {
    id: { type: "string", maxLength: 128 },
    type: { type: "string" }, // main_task | secondary_task | regular_task | ...

    name: { type: "string" },
    done: { type: "boolean" },
    points: { type: "number" },
    locked: { type: "boolean" },

    default: { type: "boolean" },
    repeat: { type: "string" }, // daily | weekly | certain_day
    repeat_days: {
      oneOf: [
        { type: "array", items: { type: "string" } },
        { type: "string" }
      ]
    }, // weekly => ["الاثنين", ...], certain_day => "YYYY-MM-DD"

    notifications: { type: "boolean" },
    enable_disable_notifications: { type: "boolean" },
    notification_time: { type: "string" },   // "" | "api" | "HH:mm"
    notification_title: { type: "string" },
    notification_sound: { type: "string" },  // "" | "adhan.mp3" ...
    notification_text: { type: "string" },

    icon: { type: "string" },   // can be "" if using image
    image: { type: "string" },  // can be "" if using icon
    redirect: { type: "string" },

    checklist: {
      type: "array",
      items: checklistItemSchema
    }
  }
} as const;

export const checkpointSchema = {
  title: "checkpoint",
  version: 0,
  primaryKey: "id",
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "type",
    "name",
    "time",
    "order",

    "locked",
    "expanded",

    "default",
    "repeat",
    "repeat_days",

    "notifications",
    "enable_disable_notifications",
    "notification_time",
    "notification_title",
    "notification_sound",
    "notification_text",

    "color",
    "icon",
    "image",
    "redirect",

    "tasks"
  ],
  properties: {
    id: { type: "string", maxLength: 128 },
    type: { type: "string" }, // "checkpoint"

    name: { type: "string" },
    time: { type: "string" }, // "api" or "HH:mm" or whatever you generate
    order: { type: "number" }, // sort order for rendering

    locked: { type: "boolean" },
    expanded: { type: "boolean" },

    default: { type: "boolean" },
    repeat: { type: "string" }, // daily | weekly | certain_day
    repeat_days: {
      oneOf: [
        { type: "array", items: { type: "string" } },
        { type: "string" }
      ]
    }, // weekly => ["الاثنين", ...], certain_day => "YYYY-MM-DD"

    notifications: { type: "boolean" },
    enable_disable_notifications: { type: "boolean" },
    notification_time: { type: "string" },
    notification_title: { type: "string" },
    notification_sound: { type: "string" },
    notification_text: { type: "string" },

    color: { type: "string" },

    icon: { type: "string" },   // can be "" if using image
    image: { type: "string" },  // can be "" if using icon
    redirect: { type: "string" },

    tasks: {
      type: "array",
      items: taskSchema
    }
  }
} as const;
