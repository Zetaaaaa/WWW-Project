'use client'
import Balatro from '@/components/Balatro'
import FuzzyText from '@/components/FuzzyText'



function notfound() {
  return (
    <div className='w-full relative min-h-screen overflow-hidden'>
      <div className="absolute inset-0 z-0">
        <Balatro
          isRotate={false}
          mouseInteraction
          pixelFilter={745}
          color1="#DE443B"
          color2="#006BB4"
          color3="#162325"
        />
      </div>
      <FuzzyText className='text-sm absolute z-10 bottom-5 text-sm'
      fontSize={"clamp(1rem, 3vw, 4rem)"}
        baseIntensity={0.1}
        hoverIntensity={0.5}
        enableHover
      >
        404 - The cards are being dealt somewhere else
      </FuzzyText>
    </div>
  )
}

export default notfound
