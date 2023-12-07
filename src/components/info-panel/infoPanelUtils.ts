const getPriceOrder = (price: number) => {
  return price <= 0.005 ? "low" : price <= 0.025 ? "normal" : "high";
};

const getDurationOrder = (duration: number) => {
  return duration <= 10 ? "low" : duration <= 25 ? "normal" : "high";
};

export const InfoPanelUtils = { getPriceOrder, getDurationOrder };
