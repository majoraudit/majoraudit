import { useCallback, useEffect, useMemo, useState, useLayoutEffect} from "react";

type Tab = "degree" | "major" | "certificate";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function useProgramNavigation(opts: {
  majorCount: number;
  certificateCount: number;
}) {
  const { majorCount, certificateCount } = opts;

  const [activeTab, setActiveTab] = useState<Tab>("degree");
  const [selectedMajorIndex, setSelectedMajorIndex] = useState(0);
  const [selectedCertificateIndex, setSelectedCertificateIndex] = useState(0);

useLayoutEffect(() => {
  if (activeTab === "major" && majorCount === 0) setActiveTab("degree");
  if (activeTab === "certificate" && certificateCount === 0) setActiveTab("degree");
}, [activeTab, majorCount, certificateCount]);

  // Keep indices valid if counts change (after remove)
  useEffect(() => {
    setSelectedMajorIndex((i) => clamp(i, 0, Math.max(0, majorCount - 1)));
  }, [majorCount]);

  useEffect(() => {
    setSelectedCertificateIndex((i) =>
      clamp(i, 0, Math.max(0, certificateCount - 1))
    );
  }, [certificateCount]);

  // If user is on a tab that becomes empty, send them back to degree
  useEffect(() => {
    if (activeTab === "major" && majorCount === 0) setActiveTab("degree");
    if (activeTab === "certificate" && certificateCount === 0) setActiveTab("degree");
  }, [activeTab, majorCount, certificateCount]);

  const goToTab = useCallback((tab: Tab) => {
    // prevent switching to empty tabs
    if (tab === "major" && majorCount === 0) return;
    if (tab === "certificate" && certificateCount === 0) return;
    setActiveTab(tab);
  }, [majorCount, certificateCount]);

  const canPrev = useMemo(() => {
    if (activeTab === "major") return selectedMajorIndex > 0;
    if (activeTab === "certificate") return selectedCertificateIndex > 0;
    return false;
  }, [activeTab, selectedMajorIndex, selectedCertificateIndex]);

  const canNext = useMemo(() => {
    if (activeTab === "major") return selectedMajorIndex < majorCount - 1;
    if (activeTab === "certificate") return selectedCertificateIndex < certificateCount - 1;
    return false;
  }, [activeTab, selectedMajorIndex, selectedCertificateIndex, majorCount, certificateCount]);

  const prev = useCallback(() => {
    if (activeTab === "major") setSelectedMajorIndex((i) => Math.max(0, i - 1));
    if (activeTab === "certificate") setSelectedCertificateIndex((i) => Math.max(0, i - 1));
  }, [activeTab]);

  const next = useCallback(() => {
    if (activeTab === "major") setSelectedMajorIndex((i) => Math.min(majorCount - 1, i + 1));
    if (activeTab === "certificate") setSelectedCertificateIndex((i) => Math.min(certificateCount - 1, i + 1));
  }, [activeTab, majorCount, certificateCount]);

  const activeIndex = useMemo(() => {
    if (activeTab === "major") return selectedMajorIndex + 1;
    if (activeTab === "certificate") return 1 + selectedMajorIndex + selectedCertificateIndex;
    return 0;
  }, [activeTab, selectedMajorIndex, selectedCertificateIndex]);

  const afterRemove = useCallback(
  (next: { majorCount: number; certificateCount: number }) => {
    const nextMajorCount = next.majorCount;
    const nextCertCount = next.certificateCount;

    if (activeTab === "major") {
      if (nextMajorCount === 0) {
        setActiveTab("degree");
        setSelectedMajorIndex(0);
      } else {
        setSelectedMajorIndex((i) => clamp(i - 1, 0, nextMajorCount - 1));
      }
      return;
    }

    if (activeTab === "certificate") {
      if (nextCertCount === 0) {
        setActiveTab("degree");
        setSelectedCertificateIndex(0);
      } else {
        setSelectedCertificateIndex((i) => clamp(i - 1, 0, nextCertCount - 1));
      }
    }
  },
  [activeTab]
);


  return {
    activeTab,
    goToTab,

    selectedMajorIndex,
    setSelectedMajorIndex,

    selectedCertificateIndex,
    setSelectedCertificateIndex,

    activeIndex,

    canPrev,
    canNext,
    prev,
    next,
    afterRemove
  };
}
