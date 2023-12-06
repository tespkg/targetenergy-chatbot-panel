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

export function toCsvCell(value: any): any {
  if (isNumber(value)) {
    return toFixed(value, 1);
  }
  return `${value}`;
}

export function hashString(str: string) {
  let hash = 0,
    i,
    chr;
  if (str.length === 0) {
    return hash;
  }
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
