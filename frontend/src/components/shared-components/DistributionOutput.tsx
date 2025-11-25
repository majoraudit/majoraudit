interface DistributionOutputProps {
  distribution: string;
}

const distributionStyles: { [key: string]: React.CSSProperties } = {
  Hu: {
    color: "rgb(153, 112, 171)",
    backgroundColor: "rgba(153, 112, 171, 0.16)",
  },
  So: {
    color: "rgb(67, 147, 195)",
    backgroundColor: "rgba(67, 147, 195, 0.16)",
  },
  WR: {
    color: "rgb(236, 112, 20)",
    backgroundColor: "rgba(236, 112, 20, 0.16)",
  },
  Sc: { color: "rgb(90, 174, 97)", backgroundColor: "rgba(90, 174, 97, 0.16)" },
  QR: { color: "rgb(204, 51, 17)", backgroundColor: "rgba(204, 51, 17, 0.16)" },
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
