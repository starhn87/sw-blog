"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export function StaggerChildren({
  children,
  className,
  as,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "section";
}) {
  const Tag = as ?? "div";
  const items = Children.toArray(children);

  return (
    <Tag className={className}>
      {items.map((child, i) => {
        if (isValidElement<{ style?: CSSProperties }>(child)) {
          return cloneElement(child, {
            style: {
              ...(child.props.style ?? {}),
              animationDelay: `${i * 100}ms`,
            },
          });
        }
        return child;
      })}
    </Tag>
  );
}

export function StaggerItem({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{ animation: "fade-in-up 0.4s ease-out both", ...style }}
    >
      {children}
    </div>
  );
}

export function ScrollReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-60px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
      }}
    >
      {children}
    </div>
  );
}
