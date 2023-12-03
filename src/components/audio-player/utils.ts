export const mergeArrayOfUint8Array = (array: Uint8Array[], length: number) => {
  let index = 0;
  let result = new Uint8Array(length);
  array.forEach((value) => {
    result.set(value, index);
    index += value.length;
  });
  return result;
};

export const AudioUtils = {
  mergeArrayOfUint8Array,
};
