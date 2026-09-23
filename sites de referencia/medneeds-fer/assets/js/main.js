document.addEventListener("DOMContentLoaded", (event) => {
  // preloader
  const preloader = document.getElementById("preloader");
  preloader.style.display = "none";
  document.body.style.position = "static";

  // HEADER NAV IN MOBILE
  if (document.querySelector(".ul-header-nav")) {
    const ulSidebar = document.querySelector(".ul-sidebar");
    const ulSidebarOpener = document.querySelector(".ul-header-sidebar-opener");
    const ulSidebarCloser = document.querySelector(".ul-sidebar-closer");
    const ulMobileMenuContent = document.querySelector(
      ".to-go-to-sidebar-in-mobile"
    );
    const ulHeaderNavMobileWrapper = document.querySelector(
      ".ul-sidebar-header-nav-wrapper"
    );
    const ulHeaderNavOgWrapper = document.querySelector(
      ".ul-header-nav-wrapper"
    );

    function updateMenuPosition(log) {
      if (window.innerWidth < 992) {
        ulHeaderNavMobileWrapper.appendChild(ulMobileMenuContent);
      }

      if (window.innerWidth >= 992) {
        ulHeaderNavOgWrapper.appendChild(ulMobileMenuContent);
      }
    }

    updateMenuPosition("running.........................");

    window.addEventListener("resize", () => {
      updateMenuPosition("on resixe");
    });

    ulSidebarOpener.addEventListener("click", () => {
      ulSidebar.classList.add("active");
    });

    ulSidebarCloser.addEventListener("click", () => {
      ulSidebar.classList.remove("active");
    });

    // menu dropdown/submenu in mobile
    const ulHeaderNavMobile = document.querySelector(".ul-header-nav");
    const ulHeaderNavMobileItems =
      ulHeaderNavMobile.querySelectorAll(".has-sub-menu");
    ulHeaderNavMobileItems.forEach((item) => {
      if (window.innerWidth < 992) {
        item.addEventListener("click", () => {
          item.classList.toggle("active");
        });
      }
    });
  }

  // header search in mobile start
  const ulHeaderSearchOpener = document.querySelector(
    ".ul-header-search-opener"
  );
  const ulHeaderSearchCloser = document.querySelector(".ul-search-closer");
  if (ulHeaderSearchOpener) {
    ulHeaderSearchOpener.addEventListener("click", () => {
      document.querySelector(".ul-search-form-wrapper").classList.add("active");
    });
  }

  if (ulHeaderSearchCloser) {
    ulHeaderSearchCloser.addEventListener("click", () => {
      document
        .querySelector(".ul-search-form-wrapper")
        .classList.remove("active");
    });
  }
  // header search in mobile end

  // sticky header
  const ulHeader = document.querySelector(".to-be-sticky");
  if (ulHeader) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 80) {
        ulHeader.classList.add("sticky");
      } else {
        ulHeader.classList.remove("sticky");
      }
    });
  }

  // wow js - animation on scroll
  new WOW({}).init();

  // Banner slider
  new Swiper(".ul-banner-reviews-slider", {
    slidesPerView: 1,
    spaceBetween: 15,
    autoplay: true,
    loop: true,
  });

  // Feedbacks Slider
  new Swiper(".ul-feedbacks-slider", {
    slidesPerView: 2.68,
    spaceBetween: 32,
    centeredSlides: true,
    loop: true,
    autoplay: true,
    navigation: {
      prevEl: ".ul-feedbacks-slider-nav .prev",
      nextEl: ".ul-feedbacks-slider-nav .next",
    },
    breakpoints: {
      1200: {
        slidesPerView: 2.68,
      },
      992: {
        slidesPerView: 2.5,
      },
      768: {
        slidesPerView: 2,
        spaceBetween: 20,
      },
      576: {
        slidesPerView: 1.45,
        spaceBetween: 20,
      },
      480: {
        slidesPerView: 1.35,
        spaceBetween: 15,
      },
      0: {
        slidesPerView: 1.08,
      },
    },
  });

  // Solution images slider (mobile only)
  if (window.innerWidth < 992) {
    const solutionSliderEl = document.querySelector(".ul-solution-slider");
    if (solutionSliderEl) {
      new Swiper(".ul-solution-slider", {
        slidesPerView: 1,
        spaceBetween: 12,
        loop: true,
        autoplay: {
          delay: 2500,
          disableOnInteraction: false,
        },
        pagination: {
          el: ".ul-solution-slider .swiper-pagination",
          clickable: true,
        },
      });
    }
  }

  // Clients Slider
  new Swiper(".ul-clients-slider", {
    slidesPerView: 6,
    spaceBetween: 79,
    loop: true,
    autoplay: true,
    breakpoints: {
      1200: {
        slidesPerView: 6,
      },
      992: {
        slidesPerView: 5,
      },
      768: {
        slidesPerView: 4,
      },
      576: {
        slidesPerView: 3,
      },
      480: {
        slidesPerView: 3,
      },
      0: {
        slidesPerView: 2,
      },
    },
  });

  // home 1 appointment select
  new SlimSelect({
    select: "#ul-appointment-doctor",
    settings: {
      contentLocation: document.getElementById(
        "ul-appointment-doctor-select-wrapper"
      ),
      showSearch: false,
    },
  });
  new SlimSelect({
    select: "#ul-appointment-treatment",
    settings: {
      contentLocation: document.getElementById(
        "ul-appointment-treatment-select-wrapper"
      ),
      showSearch: false,
    },
  });

  // INDEX-2 FEEDBACKS SLIDER
  new Swiper(".ul-2-feedbacks-slider", {
    slidesPerView: 1,
    spaceBetween: 20,
    autoplay: true,
    loop: true,
    navigation: {
      prevEl: ".ul-2-feedbacks-slider-nav .prev",
      nextEl: ".ul-2-feedbacks-slider-nav .next",
    },
  });

  //  index-2 Ticker slider
  if (document.querySelector(".ul-ticker-slider")) {
    new Splide(".ul-ticker-slider", {
      type: "loop",
      // perPage: "auto",
      perPage: 10,
      pagination: false,
      arrows: false,
      type: "loop",
    }).mount(window.splide.Extensions);
  }
});
