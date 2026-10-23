You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure
    - Tailwind CSS
        - Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not / components / ui, provide instructions on why it's important to create this folder
Copy - paste this component to / components / ui folder:
```tsx
smooth-scroll-hero.tsx
"use client";
import * as React from "react";

import {
	motion,
	useMotionTemplate,
	useScroll,
	useTransform,
} from "framer-motion";

interface iISmoothScrollHeroProps {
	/**
	 * Height of the scroll section in pixels
	 * @default 1500
	 */
	scrollHeight: number;
	/**
	 * Background image URL for desktop view
	 * @default "https://cdn.21st.dev/assets/mirror/50/50b4b749aaf073843fc6cd19e1af2e06364caf610ae881ff9d309c3f84049cec.jpg"
	 */
	desktopImage: string;
	/**
	 * Background image URL for mobile view
	 * @default "https://cdn.21st.dev/assets/mirror/1c/1c0b50c23cbd64dee0b682b601f50e5876ef5d3edca6056a3da18149021d4a79.jpg"
	 */
	mobileImage: string;
	/**
	 * Initial clip path percentage
	 * @default 25
	 */
	initialClipPercentage: number;
	/**
	 * Final clip path percentage
	 * @default 75
	 */
	finalClipPercentage: number;
}

interface iISmoothScrollHeroBackgroundProps extends iISmoothScrollHeroProps {}

const SmoothScrollHeroBackground: React.FC<
	iISmoothScrollHeroBackgroundProps
> = ({
	scrollHeight,
	desktopImage,
	mobileImage,
	initialClipPercentage,
	finalClipPercentage,
}) => {
	const {scrollY} = useScroll();

	const clipStart = useTransform(
		scrollY,
		[0, scrollHeight],
		[initialClipPercentage, 0],
	);
	const clipEnd = useTransform(
		scrollY,
		[0, scrollHeight],
		[finalClipPercentage, 100],
	);

	const clipPath = useMotionTemplate`polygon(${ clipStart } % ${ clipStart } %, ${ clipEnd } % ${ clipStart } %, ${ clipEnd } % ${ clipEnd } %, ${ clipStart } % ${ clipEnd } %)`;

	const backgroundSize = useTransform(
		scrollY,
		[0, scrollHeight + 500],
		["170%", "100%"],
	);

	return (
		<motion.div
			className="sticky top-0 h-screen w-full bg-black"
			style={{
				clipPath,
				willChange: "transform, opacity",
			}}
		>
			{/* Mobile background */}
			<motion.div
				className="absolute inset-0 md:hidden"
				style={{
					backgroundImage: `url(${ mobileImage })`,
					backgroundSize,
					backgroundPosition: "center",
					backgroundRepeat: "no-repeat",
				}}
			/>
			{/* Desktop background */}
			<motion.div
				className="absolute inset-0 hidden md:block"
				style={{
					backgroundImage: `url(${ desktopImage })`,
					backgroundSize,
					backgroundPosition: "center",
					backgroundRepeat: "no-repeat",
				}}
			/>
		</motion.div>
	);
};

/**
 * A smooth scroll hero component with parallax background effect
 * @param props - Component props
 * @returns React component
 */
 const SmoothScrollHero: React.FC<iISmoothScrollHeroProps> = ({
	scrollHeight = 1500,
	desktopImage = "https://cdn.21st.dev/assets/mirror/50/50b4b749aaf073843fc6cd19e1af2e06364caf610ae881ff9d309c3f84049cec.jpg",
	mobileImage = "https://cdn.21st.dev/assets/mirror/1c/1c0b50c23cbd64dee0b682b601f50e5876ef5d3edca6056a3da18149021d4a79.jpg",
	initialClipPercentage = 25,
	finalClipPercentage = 75,
}) => {
	return (
		<div
			style={{height: `calc(${ scrollHeight }px + 100vh)`}}
			className="relative w-full"
		>
			<SmoothScrollHeroBackground
				scrollHeight={scrollHeight}
				desktopImage={desktopImage}
				mobileImage={mobileImage}
				initialClipPercentage={initialClipPercentage}
				finalClipPercentage={finalClipPercentage}
			/>
		</div>
	);
};
export default SmoothScrollHero;


demo.tsx
import SmoothScrollHero  from "@/components/ui/smooth-scroll-hero";

const DemoOne = () => {
  return (
    <div className="relative min-h-screen">
				<SmoothScrollHero
					scrollHeight={1500}
					desktopImage="https://cdn.21st.dev/assets/mirror/50/50b4b749aaf073843fc6cd19e1af2e06364caf610ae881ff9d309c3f84049cec.jpg"
					mobileImage="https://cdn.21st.dev/assets/mirror/1c/1c0b50c23cbd64dee0b682b601f50e5876ef5d3edca6056a3da18149021d4a79.jpg"
					initialClipPercentage={25}
					finalClipPercentage={75}
				/>
			</div>
  );
};

export { DemoOne };

```

Install NPM dependencies:
```bash
framer-motion
```

Implementation Guidelines
1. Analyze the component structure and identify all required dependencies
2. Review the component's argumens and state
3. Identify any required context providers or hooks and install them
4. Questions to Ask
    - What data / props will be passed to this component ?
        - Are there any specific state management requirements ?
            - Are there any required assets(images, icons, etc.) ?
                - What is the expected responsive behavior ?
                    - What is the best place to use this component in the app ?

                        Steps to integrate
0. Copy paste all the code above in the correct directories
1. Install external dependencies
2. Fill image assets with Unsplash stock images you know exist
3. Use lucide - react icons for svgs or logos if component requires them
