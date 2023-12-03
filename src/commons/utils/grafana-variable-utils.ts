import { getTemplateSrv, locationService } from "@grafana/runtime";

export const getGrafanaVariable = (variableName: string) => {
  const vars = getTemplateSrv().getVariables();
  return vars.find((v) => v.name === variableName);
};
export const setGrafanaVariable = (variableName: string, value: string) =>
  locationService.partial({ [`var-${variableName}`]: value }, true);
