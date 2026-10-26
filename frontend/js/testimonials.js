/**
 * ==============================================================================
 * RIDO — Customer Testimonials Carousel Controller & Dataset (`testimonials.js`)
 * ==============================================================================
 */

window.RIDO_TESTIMONIALS = [
  {
    id: 1,
    name: "Arjun Mehta",
    role: "Operations Manager",
    company: "SwiftLog Transport",
    category: "Intercity Freight",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80",
    rating: 5,
    quote: "RIDO has made route planning dramatically easier for our operations team. We can plan complex deliveries in minutes instead of manually working through multiple routes.",
    highlight: "⏱️ -42% Route Planning Time",
    logoColor: "bg-orange-600",
    verified: true
  },
  {
    id: 2,
    name: "Priya Sharma",
    role: "Head of Logistics",
    company: "UrbanKart Supply",
    category: "E-Commerce Supply",
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80",
    rating: 5,
    quote: "The real-time visibility gives our team confidence throughout the delivery journey. We identify delays earlier and keep customers informed.",
    highlight: "🟢 99.4% On-Time SLA Delivery",
    logoColor: "bg-blue-600",
    verified: true
  },
  {
    id: 3,
    name: "Rahul Verma",
    role: "Fleet Manager",
    company: "NorthStar Distribution",
    category: "Cold-Chain Logistics",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80",
    rating: 5,
    quote: "We now have a much clearer view of route costs and vehicle utilization. RIDO has helped us make better decisions every day.",
    highlight: "💰 18.5% Fuel & Toll Savings",
    logoColor: "bg-emerald-600",
    verified: true
  },
  {
    id: 4,
    name: "Vikramaditya Sengupta",
    role: "VP of Supply Chain",
    company: "Bharat Express Cargo",
    category: "Heavy Freight Fleet",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=160&auto=format&fit=crop&q=80",
    rating: 5,
    quote: "Comparing truck payload capacities against toll tariffs and fuel consumption was painful before. RIDO automates optimal vehicle-to-route assignment instantly.",
    highlight: "🚛 300+ Trucks Optimized Daily",
    logoColor: "bg-amber-600",
    verified: true
  },
  {
    id: 5,
    name: "Ananya Deshmukh",
    role: "Operations Lead",
    company: "QuickHaul Logistics",
    category: "Last-Mile Delivery",
    photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=160&auto=format&fit=crop&q=80",
    rating: 5,
    quote: "Driver dispatch and multi-drop manifests are now completely seamless. Our dispatchers save 3 hours every morning on route assignment.",
    highlight: "⚡ 3-Hour Daily Dispatcher Savings",
    logoColor: "bg-purple-600",
    verified: true
  },
  {
    id: 6,
    name: "Karan Singhania",
    role: "Managing Director",
    company: "Apex Logistics Network",
    category: "Pan-India Freight",
    photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=160&auto=format&fit=crop&q=80",
    rating: 5,
    quote: "The FASTag integration and highway toll calculations are spot on. Accurate trip cost forecasting has protected our transport margins across all state corridors.",
    highlight: "🎯 99.8% Toll & Cost Accuracy",
    logoColor: "bg-indigo-600",
    verified: true
  }
];

class TestimonialsCarouselManager {
  constructor() {
    this.currentIndex = 0;
    this.autoSlideInterval = null;
    this.autoSlideDelay = 5000;
    this.touchStartX = 0;
    this.touchEndX = 0;
    this.testimonials = window.RIDO_TESTIMONIALS || [];
    this.trackElem = null;
    this.dotsElem = null;
    this.prevBtn = null;
    this.nextBtn = null;
    this.containerElem = null;
    this.isPaused = false;
  }

  getCardsPerView() {
    const width = window.innerWidth;
    if (width >= 1024) return 3;
    if (width >= 640) return 2;
    return 1;
  }

  getMaxIndex() {
    const cardsPerView = this.getCardsPerView();
    return Math.max(0, this.testimonials.length - cardsPerView);
  }

  init() {
    this.trackElem = document.getElementById("testimonial-slides-track");
    this.dotsElem = document.getElementById("testimonial-pagination-dots");
    this.prevBtn = document.getElementById("testimonial-prev-btn");
    this.nextBtn = document.getElementById("testimonial-next-btn");
    this.containerElem = document.getElementById("rido-testimonial-carousel-container");

    if (!this.trackElem || this.testimonials.length === 0) return;

    this.renderCards();
    this.renderDots();
    this.attachEventListeners();
    this.updateCarousel(false);
    this.startAutoSlide();
  }

  renderCards() {
    if (!this.trackElem) return;

    this.trackElem.innerHTML = this.testimonials
      .map((item, idx) => {
        const starsHTML = Array(item.rating || 5)
          .fill(0)
          .map(
            () =>
              '<svg class="w-4 h-4 text-orange-500 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>'
          )
          .join("");

        const initials = item.name
          .split(" ")
          .map((n) => n[0])
          .join("");

        return `
        <div class="testimonial-slide" data-index="${idx}">
          <div class="testimonial-card">
            <svg class="testimonial-quote-icon w-14 h-14 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
            </svg>

            <div class="flex items-center justify-between gap-2 mb-4">
              <div class="flex items-center gap-1" title="5 Star Rating">${starsHTML}</div>
              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-100 text-orange-700 text-[11px] font-mono font-bold shadow-2xs">${item.highlight}</span>
            </div>

            <blockquote class="text-slate-700 text-sm sm:text-[14.5px] leading-relaxed font-normal mb-6 relative z-10 flex-grow text-left">
              "${item.quote}"
            </blockquote>

            <div class="pt-4 border-t border-slate-100/90 flex items-center justify-between gap-3 mt-auto text-left">
              <div class="flex items-center gap-3">
                <div class="relative w-11 h-11 rounded-full overflow-hidden border-2 border-orange-100 shadow-xs shrink-0 bg-slate-100">
                  <img src="${item.photo}" alt="${item.name}" class="w-full h-full object-cover" onerror="this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
                  <div class="hidden w-full h-full ${item.logoColor || 'bg-orange-600'} text-white font-bold text-xs items-center justify-center">${initials}</div>
                </div>
                <div class="flex flex-col text-left">
                  <div class="flex items-center gap-1.5">
                    <span class="text-sm font-bold text-slate-900 leading-tight">${item.name}</span>
                    ${item.verified ? '<svg class="w-3.5 h-3.5 text-emerald-600 fill-current" viewBox="0 0 20 20" title="Verified Customer"><path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>' : ''}
                  </div>
                  <span class="text-[11.5px] text-slate-500 font-medium">${item.role} · <strong class="text-slate-700 font-semibold">${item.company}</strong></span>
                </div>
              </div>
            </div>

          </div>
        </div>`;
      })
      .join("");
  }

  renderDots() {
    if (!this.dotsElem) return;

    const cardsPerView = this.getCardsPerView();
    const totalDots = Math.max(1, this.testimonials.length - cardsPerView + 1);

    this.dotsElem.innerHTML = Array(totalDots)
      .fill(0)
      .map(
        (_, idx) =>
          `<button type="button" class="testimonial-dot h-2 rounded-full transition-all duration-300 cursor-pointer border-none ${idx === this.currentIndex ? 'w-6 bg-orange-600' : 'w-2 bg-slate-300 hover:bg-slate-400'}" data-dot-index="${idx}" aria-label="Go to testimonial slide ${idx + 1}"></button>`
      )
      .join("");

    this.dotsElem.querySelectorAll(".testimonial-dot").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const targetIdx = parseInt(e.currentTarget.dataset.dotIndex, 10);
        this.goTo(targetIdx);
      });
    });
  }

  updateCarousel(animated = true) {
    if (!this.trackElem) return;

    const cardsPerView = this.getCardsPerView();
    const slidePercent = 100 / cardsPerView;
    const offset = -(this.currentIndex * slidePercent);

    if (animated) {
      this.trackElem.style.transition = "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)";
    } else {
      this.trackElem.style.transition = "none";
    }

    this.trackElem.style.transform = `translateX(${offset}%)`;

    const slides = this.trackElem.querySelectorAll(".testimonial-slide");
    slides.forEach((s, idx) => {
      s.classList.remove("is-center");
      if (cardsPerView === 3 && idx === this.currentIndex + 1) {
        s.classList.add("is-center");
      }
    });

    if (this.dotsElem) {
      const dots = this.dotsElem.querySelectorAll(".testimonial-dot");
      dots.forEach((dot, idx) => {
        if (idx === this.currentIndex) {
          dot.className = "testimonial-dot h-2 rounded-full transition-all duration-300 cursor-pointer border-none w-6 bg-orange-600";
        } else {
          dot.className = "testimonial-dot h-2 rounded-full transition-all duration-300 cursor-pointer border-none w-2 bg-slate-300 hover:bg-slate-400";
        }
      });
    }
  }

  next() {
    const maxIdx = this.getMaxIndex();
    if (this.currentIndex >= maxIdx) {
      this.currentIndex = 0;
    } else {
      this.currentIndex++;
    }
    this.updateCarousel(true);
  }

  prev() {
    const maxIdx = this.getMaxIndex();
    if (this.currentIndex <= 0) {
      this.currentIndex = maxIdx;
    } else {
      this.currentIndex--;
    }
    this.updateCarousel(true);
  }

  goTo(index) {
    const maxIdx = this.getMaxIndex();
    this.currentIndex = Math.max(0, Math.min(index, maxIdx));
    this.updateCarousel(true);
  }

  startAutoSlide() {
    this.stopAutoSlide();
    this.autoSlideInterval = setInterval(() => {
      if (!this.isPaused) {
        this.next();
      }
    }, this.autoSlideDelay);
  }

  stopAutoSlide() {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
      this.autoSlideInterval = null;
    }
  }

  attachEventListeners() {
    if (this.prevBtn) {
      this.prevBtn.addEventListener("click", () => {
        this.prev();
        this.startAutoSlide();
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", () => {
        this.next();
        this.startAutoSlide();
      });
    }

    if (this.containerElem) {
      this.containerElem.addEventListener("mouseenter", () => {
        this.isPaused = true;
      });

      this.containerElem.addEventListener("mouseleave", () => {
        this.isPaused = false;
      });

      this.containerElem.addEventListener("focusin", () => {
        this.isPaused = true;
      });

      this.containerElem.addEventListener("focusout", () => {
        this.isPaused = false;
      });

      this.containerElem.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") {
          this.prev();
          this.startAutoSlide();
        } else if (e.key === "ArrowRight") {
          this.next();
          this.startAutoSlide();
        }
      });

      this.containerElem.addEventListener(
        "touchstart",
        (e) => {
          this.touchStartX = e.touches[0].clientX;
          this.isPaused = true;
        },
        { passive: true }
      );

      this.containerElem.addEventListener(
        "touchend",
        (e) => {
          this.touchEndX = e.changedTouches[0].clientX;
          this.isPaused = false;
          this.handleTouchSwipe();
        },
        { passive: true }
      );
    }

    window.addEventListener("resize", () => {
      const maxIdx = this.getMaxIndex();
      if (this.currentIndex > maxIdx) {
        this.currentIndex = maxIdx;
      }
      this.renderDots();
      this.updateCarousel(false);
    });
  }

  handleTouchSwipe() {
    const diff = this.touchStartX - this.touchEndX;
    const threshold = 40;

    if (diff > threshold) {
      this.next();
    } else if (diff < -threshold) {
      this.prev();
    }
  }
}

window.TestimonialsCarousel = new TestimonialsCarouselManager();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.TestimonialsCarousel.init();
  });
} else {
  window.TestimonialsCarousel.init();
}