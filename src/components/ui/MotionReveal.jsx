import { createElement } from "react";
import useInView from "../../hooks/useInView";

function joinClassNames(...values) {
  return values.filter(Boolean).join(" ");
}

export default function MotionReveal({
  as = "div",
  children,
  className,
  delay = 0,
  distance = 32,
  blur = 10,
  once = true,
  threshold = 0.16,
  rootMargin,
  style,
  ...props
}) {
  const { ref, isVisible } = useInView({ once, threshold, rootMargin });
  const Component = as || "div";

  return createElement(
    Component,
    {
      ref,
      className: joinClassNames("motion-reveal", isVisible ? "is-visible" : "", className),
      style: {
        "--motion-delay": `${delay}ms`,
        "--motion-distance": `${distance}px`,
        "--motion-blur": `${blur}px`,
        ...style,
      },
      ...props,
    },
    children
  );
}
