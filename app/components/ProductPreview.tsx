import Image from "next/image"

export default function ProductPreview() {
  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
      <div className="relative rounded-lg overflow-hidden border border-white/10 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-accent/10 to-transparent" />
        <Image
          src="https://sjc.microlink.io/dACoBD81V0jhbU_TaUYiRrOVrhAXOh8TCYVdXmvVaYFIpbvF9B17bU0pnQF3gHfzVAOFzC-nwZVACScUpFYQsg.jpeg"
          alt="Huly App Interface"
          width={1200}
          height={800}
          className="w-full h-auto"
        />
      </div>
      {/* Glow effect */}
      <div className="absolute -inset-x-20 top-0 h-[500px] bg-gradient-conic opacity-30 blur-3xl" />
    </div>
  )
}

