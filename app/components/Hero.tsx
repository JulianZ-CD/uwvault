import { Button } from "@/app/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

export default function Hero() {
  return (
    <section className="container flex min-h-[calc(100vh-3.5rem)] max-w-screen-2xl flex-col items-center justify-center space-y-8 py-24 text-center md:py-32">
      <div className="space-y-4">
        <h1 className="bg-gradient-to-br from-foreground from-30% via-foreground/90 to-foreground/70 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl md:text-6xl lg:text-7xl">
          <span className="font-medium tracking-wide">More Heads, The Better</span>
          <br />
          <span className="italic">UWvault</span>
        </h1>
        <p className="mx-auto max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
        A cloud-based web application for students to upload, categorize, and access course materials. With a sophisticated rating system that, combined with user preferences and relevance metrics.
        </p>
      </div>
      <div className="flex gap-4">
        <Link href="/login" className="flex items-center">
          <Button size="lg">
            Sign In
           <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  )
}

