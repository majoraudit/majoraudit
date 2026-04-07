import type { CSSProperties } from "react";

interface DistributionOutputProps {
  distribution: string;
}

const distributionStyles: { [key: string]: CSSProperties } = {
  Hu: { color: "#9970ac", backgroundColor: "#efe8f2" },
  So: { color: "#4393c3", backgroundColor: "#e2edf6" },
  Sc: { color: "#5aae61", backgroundColor: "#e6f2e6" },
  QR: { color: "#cc3410", backgroundColor: "#f8dfdb" },
  WR: { color: "#ed7015", backgroundColor: "#fce8dc" },
  L1: {
    color: "rgb(136, 136, 136)",
    backgroundColor: "rgba(136, 136, 136, 0.16)",
  },
  L2: {
    color: "rgb(136, 136, 136)",
    backgroundColor: "rgba(136, 136, 136, 0.16)",
  },
  L3: {
    color: "rgb(136, 136, 136)",
    backgroundColor: "rgba(136, 136, 136, 0.16)",
  },
  L4: {
    color: "rgb(136, 136, 136)",
    backgroundColor: "rgba(136, 136, 136, 0.16)",
  },
  L5: {
    color: "rgb(136, 136, 136)",
    backgroundColor: "rgba(136, 136, 136, 0.16)",
  },
};

function DistributionOutput({ distribution }: DistributionOutputProps) {
  const style = distributionStyles[distribution];
  return (
<>
      <div className="rounded-md py-0.4 px-2" style={style}>
        {distribution}
      </div>
    </>
  );
}

export default DistributionOutput;
