import Hero from '@/components/home/Hero'
import Features from '@/components/home/Features'
import DataSources from '@/components/home/DataSources'
import DemoSection from '@/components/home/DemoSection'

export default function HomePage() {
  return (
    <div className="space-y-0">
      <Hero />
      <Features />
      <DemoSection />
      <DataSources />
    </div>
  )
}
