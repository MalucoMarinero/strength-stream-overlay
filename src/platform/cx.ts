export default function (classObj: { [key: string]: boolean }, blockName?: string) {
  return Object.keys(classObj).reduce(function (acc, className) {
    const active = classObj[className];
    if (active && blockName) {
      acc.push(className.split("&").join(blockName));
    } else if (active) {
      acc.push(className);
    }
    return acc;
  }, []).join(" ");
}
