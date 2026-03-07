import { useCallback, useState } from "react";
import { Linking } from "react-native";
import { checkForAppUpdate, UpdateCheckResult } from "../services/updateService";

type UseAppUpdateResult = {
  isChecking: boolean;
  isVisible: boolean;
  updateInfo: UpdateCheckResult | null;
  runUpdateCheck: () => Promise<void>;
  onUpdatePress: () => Promise<void>;
  onLaterPress: () => void;
};

export function useAppUpdate(): UseAppUpdateResult {
  const [isChecking, setIsChecking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);

  const runUpdateCheck = useCallback(async () => {
    setIsChecking(true);
    try {
      const result = await checkForAppUpdate();
      setUpdateInfo(result);
      setIsVisible(result.isUpdateAvailable);
    } catch (error) {
      console.warn("[update-check] unexpected failure", error);
      setUpdateInfo(null);
      setIsVisible(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  const onUpdatePress = useCallback(async () => {
    const url = updateInfo?.downloadUrl;
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn("[update-check] failed to open update url", error);
    }
  }, [updateInfo?.downloadUrl]);

  const onLaterPress = useCallback(() => {
    if (updateInfo?.isMandatory) return;
    setIsVisible(false);
  }, [updateInfo?.isMandatory]);

  return {
    isChecking,
    isVisible,
    updateInfo,
    runUpdateCheck,
    onUpdatePress,
    onLaterPress,
  };
}
