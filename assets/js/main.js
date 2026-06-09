// ============================================
// MAIN.JS - GRADR.TECH WEBSITE
// ============================================

// NAVBAR SCROLL EFFECT
document.addEventListener('DOMContentLoaded', function () {
  const nav = document.querySelector('nav');
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');

  // Navbar scroll effect
  window.addEventListener('scroll', function () {
    if (window.scrollY > 30) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });

  // Mobile hamburger menu
  if (hamburger) {
    hamburger.addEventListener('click', function () {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('active');
    });

    // Close menu when link is clicked
    const navItems = navLinks.querySelectorAll('a');
    navItems.forEach(item => {
      item.addEventListener('click', function () {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });
  }

  // SCROLL REVEAL - IntersectionObserver
  const revealSections = document.querySelectorAll('.section-reveal');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1
    });

    revealSections.forEach(section => {
      revealObserver.observe(section);
    });
  } else {
    // Fallback for browsers without IntersectionObserver
    revealSections.forEach(section => {
      section.classList.add('visible');
    });
  }

  // SKILL ANIMATION
  const skillBars = document.querySelectorAll('.skill-progress');
  
  if (skillBars.length > 0 && 'IntersectionObserver' in window) {
    const skillObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const skillItem = entry.target.closest('.skill-item');
          const percentage = entry.target.getAttribute('data-percentage');
          entry.target.style.setProperty('--skill-width', percentage);
          skillItem.classList.add('visible');
          skillObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.3
    });

    skillBars.forEach(bar => {
      skillObserver.observe(bar);
    });
  }

  // FORM HANDLING (Contact Page)
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      // Get form data
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const phone = document.getElementById('phone').value;
      const company = document.getElementById('company').value;
      const industry = document.getElementById('industry').value;
      const message = document.getElementById('message').value;

      // Basic validation
      if (!name || !email || !message) {
        alert('Please fill in all required fields.');
        return;
      }

      // Construct email body with form data
      const emailBody = `Hello GRADR.TECH Team,\n\nI would like to inquire about your services.\n\n--- Project Details ---\nName: ${name}\nEmail: ${email}\nPhone: ${phone || 'Not provided'}\nCompany: ${company || 'Not provided'}\nIndustry: ${industry || 'Not provided'}\n\n--- Message ---\n${message}\n\n---\nPlease get back to me at your earliest convenience.\n\nThank you!`;

      // Create mailto link with pre-filled data
      const mailtoLink = `mailto:websitesbrian585@gmail.com?subject=Project%20Inquiry%20from%20${encodeURIComponent(name)}&body=${encodeURIComponent(emailBody)}`;

      // Open Gmail with pre-filled email
      window.location.href = mailtoLink;

      // Show success message
      contactForm.style.display = 'none';
      const successMsg = document.getElementById('successMessage');
      if (successMsg) {
        successMsg.classList.add('show');
      }
      // Reset form
      contactForm.reset();
    });
  }

  // SMOOTH SCROLL FOR ANCHOR LINKS
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href !== '#') {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  // ACTIVE NAV LINK
  const navLinksAll = document.querySelectorAll('.nav-links a');
  
  // Set active link based on current page
  function setActiveLink() {
    let currentPage = window.location.pathname.split('/').pop();
    if (!currentPage || currentPage === '') {
      currentPage = 'index.html';
    }
    
    navLinksAll.forEach(link => {
      const href = link.getAttribute('href');
      const linkPage = href.split('/').pop();
      
      // Handle both "page.html" and file path patterns
      if (linkPage === currentPage || 
          (currentPage === 'index.html' && (href === 'index.html' || href === '/' || href === './')) ||
          (linkPage === currentPage)) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
  
  // Set active on page load
  setActiveLink();
  
  // Also handle scroll-based active state on homepage
  window.addEventListener('scroll', function () {
    let current = '';

    const sections = document.querySelectorAll('section[id]');
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      if (window.pageYOffset >= sectionTop - 200) {
        current = section.getAttribute('id');
      }
    });

    navLinksAll.forEach(link => {
      const href = link.getAttribute('href');
      if (href.startsWith('#') && href.slice(1) === current) {
        link.classList.add('active');
      } else if (!href.startsWith('#')) {
        link.classList.remove('active');
      }
    });
  });
});

// PARALLAX EFFECT (optional for hero)
window.addEventListener('scroll', function () {
  const heroRight = document.querySelector('.hero-right');
  if (heroRight) {
    const scrolled = window.pageYOffset;
    heroRight.style.transform = `translateY(${scrolled * 0.5}px)`;
  }
});
