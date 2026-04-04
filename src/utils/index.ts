export const uid = (): string => Math.random().toString(36).slice(2, 9);

export const debounce = <T extends unknown[]>(
  fn: (...args: T) => void,
  ms = 300
): ((...args: T) => void) => {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: T) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};
