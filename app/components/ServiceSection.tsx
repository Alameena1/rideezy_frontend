
import Image from 'next/image'
import Link from 'next/link'

interface ServiceSectionProps {
  title: string
  description: string
  imageUrl: string
  imagePosition?: 'left' | 'right'
  ctaText?: string
  ctaLink?: string
}

const ServiceSection = ({ 
  title, 
  description, 
  imageUrl, 
  imagePosition = 'right',
  ctaText = 'Learn More',
  ctaLink = '#'
}: ServiceSectionProps) => {
  return (
    <div className="py-12 px-4 md:px-6 lg:px-8 border-t border-gray-100">
      <div className={`flex flex-col ${imagePosition === 'left' ? 'md:flex-row-reverse' : 'md:flex-row'} items-center`}>
        <div className="md:w-1/2 mb-8 md:mb-0 md:px-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">{title}</h2>
          <p className="text-gray-600 mb-6">{description}</p>
          <Link 
            href={ctaLink} 
            className="inline-block px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
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
            className="rounded-lg shadow object-cover"
          />
        </div>
      </div>
    </div>
  )
}

export default ServiceSection