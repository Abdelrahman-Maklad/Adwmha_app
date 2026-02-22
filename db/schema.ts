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
    "default",
    "repeat",

    "notifications",
    "enable_disable_notifications",
    "notification_time",
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

    default: { type: "boolean" },
    repeat: { type: "string" }, // daily | weekly | ...

    notifications: { type: "boolean" },
    enable_disable_notifications: { type: "boolean" },
    notification_time: { type: "string" },   // "" | "api" | "HH:mm"
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

    "locked",
    "expanded",

    "default",
    "repeat_type",

    "notifications",
    "enable_disable_notifications",
    "notification_time",
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

    locked: { type: "boolean" },
    expanded: { type: "boolean" },

    default: { type: "boolean" },
    repeat_type: { type: "string" }, // daily | weekly | ...

    notifications: { type: "boolean" },
    enable_disable_notifications: { type: "boolean" },
    notification_time: { type: "string" },
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