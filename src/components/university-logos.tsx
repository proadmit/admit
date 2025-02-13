"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useAnimation, useMotionValue } from "framer-motion";
import Image from "next/image";

const logos = [
  { name: "Princeton", src: "/assets/Princeton-University-Logo.png" },
  { name: "Stanford", src: "/assets/Stanford-Logo.png" },
  { name: "NYU", src: "/assets/nyu.png" },
  { name: "Harvard", src: "/assets/harvard.png" },
  { name: "Oxford", src: "/assets/oxford.png" },
  { name: "Cambridge", src: "/assets/cambridge.png" },
];

export function UniversityLogos() {
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredLogo, setHoveredLogo] = useState<string | null>(null);

  useEffect(() => {
    const startAnimation = async () => {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.offsetWidth;
      const singleSetWidth = containerWidth / 2;

      await controls.start({
        x: -singleSetWidth,
        transition: {
          duration: 20,
          ease: "linear",
          repeat: Infinity,
          repeatType: "loop",
        },
      });
    };

    if (!hoveredLogo) {
      startAnimation();
    } else {
      controls.stop();
    }

    return () => {
      controls.stop();
    };
  }, [hoveredLogo, controls]);

  return (
    <div
      className="relative overflow-hidden w-full h-20"
      onMouseEnter={() => setHoveredLogo(null)}
      onMouseLeave={() => setHoveredLogo(null)}
    >
      <motion.div
        ref={containerRef}
        className="flex gap-8 absolute"
        animate={controls}
        style={{ x: 0 }}
      >
        {/* First set of logos */}
        {logos.map((logo) => (
          <div
            key={logo.name}
            className="relative w-32 h-16 flex-shrink-0 transition-all duration-300 cursor-pointer"
            onMouseEnter={() => setHoveredLogo(logo.name)}
            onMouseLeave={() => setHoveredLogo(null)}
            style={{
              filter:
                hoveredLogo === logo.name ? "grayscale(0)" : "grayscale(1)",
              transition: "filter 0.3s ease",
            }}
          >
            <Image
              src={logo.src}
              alt={`${logo.name} University`}
              fill
              className="object-contain"
            />
          </div>
        ))}
        {/* Duplicate set of logos for seamless scrolling */}
        {logos.map((logo) => (
          <div
            key={`duplicate-${logo.name}`}
            className="relative w-32 h-16 flex-shrink-0 transition-all duration-300 cursor-pointer"
            onMouseEnter={() => setHoveredLogo(logo.name)}
            onMouseLeave={() => setHoveredLogo(null)}
            style={{
              filter:
                hoveredLogo === logo.name ? "grayscale(0)" : "grayscale(1)",
              transition: "filter 0.3s ease",
            }}
          >
            <Image
              src={logo.src}
              alt={`${logo.name} University`}
              fill
              className="object-contain"
            />
          </div>
        ))}
        {/* Third set of logos to ensure seamless loop */}
        {logos.map((logo) => (
          <div
            key={`triplicate-${logo.name}`}
            className="relative w-32 h-16 flex-shrink-0 transition-all duration-300 cursor-pointer"
            onMouseEnter={() => setHoveredLogo(logo.name)}
            onMouseLeave={() => setHoveredLogo(null)}
            style={{
              filter:
                hoveredLogo === logo.name ? "grayscale(0)" : "grayscale(1)",
              transition: "filter 0.3s ease",
            }}
          >
            <Image
              src={logo.src}
              alt={`${logo.name} University`}
              fill
              className="object-contain"
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
