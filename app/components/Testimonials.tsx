"use client";
import { Star, Quote } from "lucide-react";

export const TestimonialSection = () => {
  const testimonials = [
    {
      name: "Sarah Mitchell",
      business: "SJM Plumbing & Heating",
      location: "Calgary, AB",
      text: "Randy built our site in 5 days. We got 3 calls the first week. Easiest decision ever.",
      rating: 5,
      metric: "+180% leads",
    },
    {
      name: "James Chen",
      business: "Chen's Auto Detailing",
      location: "Edmonton, AB",
      text: "Professional, fast, and didn't break the bank. Site looks like a $5K job.",
      rating: 5,
      metric: "$8K revenue/mo",
    },
    {
      name: "Lisa Kowalski",
      business: "LK Personal Training",
      location: "Red Deer, AB",
      text: "Finally have an online presence that matches my business. Bookings tripled.",
      rating: 5,
      metric: "+65 bookings",
    },
    {
      name: "Marcus Rodriguez",
      business: "Rodriguez Electrical",
      location: "Cochrane, AB",
      text: "Randy understood what we needed without hand-holding. On time, under budget.",
      rating: 5,
      metric: "ROI in 6 weeks",
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-950/50 border-t border-slate-800">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Trusted by Alberta's Best
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Real businesses. Real results. Real growth from custom websites that convert.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {testimonials.map((testimonial, idx) => (
            <div
              key={idx}
              className="group relative bg-slate-900/80 border border-slate-800 rounded-lg p-8 hover:border-blue-600/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-600/10"
              style={{
                animation: `fadeInUp 0.6s ease-out ${idx * 0.1}s both`,
              }}
            >
              <Quote className="absolute top-6 right-6 w-8 h-8 text-blue-600/20 group-hover:text-blue-600/40 transition-colors" />

              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>

              <p className="text-slate-300 mb-6 text-sm leading-relaxed italic">
                "{testimonial.text}"
              </p>

              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-white text-sm">
                    {testimonial.name}
                  </p>
                  <p className="text-slate-500 text-xs">
                    {testimonial.business}
                  </p>
                  <p className="text-slate-600 text-xs mt-1">
                    {testimonial.location}
                  </p>
                </div>
                <div className="bg-blue-600/10 border border-blue-600/30 rounded px-3 py-2 text-right">
                  <p className="text-xs font-semibold text-blue-400">
                    {testimonial.metric}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6 py-12 border-t border-slate-800">
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-2">47+</p>
            <p className="text-slate-400 text-sm">Sites Launched</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-2">4.9★</p>
            <p className="text-slate-400 text-sm">Average Rating</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white mb-2">$2.1M+</p>
            <p className="text-slate-400 text-sm">Client Revenue Generated</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
};

export default TestimonialSection;
