import { Star } from "lucide-react";

export type Testimonial = {
  name: string;
  role: string;
  body: string;
  avatar: string;
};

export function LandingTestimonials({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section id="testimonials" className="scroll-mt-0 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          Operators who run on PulseIQ
        </h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article
              key={testimonial.name}
              className="rounded-xl border border-border bg-card p-6 shadow-card transition hover:border-primary/25 hover:shadow-glow"
            >
              <div className="flex gap-0.5 text-chart-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">&quot;{testimonial.body}&quot;</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-brand text-xs font-semibold text-primary-foreground">
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="text-sm font-medium">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
