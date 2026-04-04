import React, { type FC } from "react";
import { useCounter } from "../../hooks/useCounter";

interface StatItemProps {
  count: number;
  suffix: string;
  label: string;
}

const StatItem: FC<StatItemProps> = ({ count, suffix, label }) => {
  const { ref, value } = useCounter(count, suffix);
  return (
    <div className="stat-item">
      <div className="stat-item__number" ref={ref}>{value}</div>
      <div className="stat-item__label">{label}</div>
    </div>
  );
};

export default StatItem;
