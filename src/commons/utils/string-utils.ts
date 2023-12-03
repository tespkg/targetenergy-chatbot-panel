import { isNumber } from "lodash";
import { toFixed } from "./number-utils";

export const stringToUpperUnderscored = (input: string) => {
  return input?.toUpperCase().replace(/ +/g, "_");
};

export function formatTemplatedString(templatedString: string, variables: any) {
  for (let [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\$\{${key}\}`, "g");
    templatedString = templatedString.replace(pattern, value as string);
  }
  return templatedString;
}

export function toCsvCell(value: any): string {
  if (isNumber(value)) {
    return `${toFixed(value, 1)}`;
  }
  return `${value}`;
}
