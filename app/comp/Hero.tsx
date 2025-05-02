
import Image from 'next/image'
import Link from 'next/link'

interface HeroProps {
  title: string
  subtitle: string
  imageUrl: string
  ctaText: string
  ctaLink: string
}

const Hero = ({ title, subtitle, imageUrl, ctaText, ctaLink }: HeroProps) => {
  return (
    <div className="flex flex-col md:flex-row items-center py-12 px-4 md:px-6 lg:px-8">
      <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">{title}</h1>
        <p className="text-lg text-gray-600 mb-6">{subtitle}</p>
        <Link 
          href={ctaLink} 
          className="inline-block px-6 py-3 bg-black text-white rounded hover:bg-gray-800"
        >
          {ctaText}
        </Link>
      </div>
      <div className="md:w-1/2">
        <Image 
          src={imageUrl} 
          alt={title} 
          width={700} 
          height={500} 
          className="rounded-lg shadow-md object-cover"
          priority
        />
      </div>
    </div>
  )
}

export default Hero