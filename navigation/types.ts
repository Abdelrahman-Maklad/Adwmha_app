export type RootStackParamList = {
  Timeline: undefined;
  AdhkarDetails: { setId: string };
  NotificationDebug: undefined;
  NotificationHealth: undefined;
  QuranReference: {
    titleAr: string;
    quran: {
      surah: number;
      mode: "full" | "single" | "range";
      ayah?: number;
      from?: number;
      to?: number;
    };
  };
};
