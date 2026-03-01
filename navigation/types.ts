export type RootStackParamList = {
  Timeline: undefined;
  AdhkarDetails: { setId: "adhkar_morning" | "adhkar_evening" };
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
