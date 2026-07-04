// NAVBAR SCROLL
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 30);
  });
}

// HAMBURGER
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    hamburger.classList.toggle('active');
  });
  // Close on link click
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.classList.remove('active');
    });
  });
}

// ACTIVE NAV LINK
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(a => {
  const href = a.getAttribute('href');
  if (href === currentPage || (currentPage === '' && href === 'index.html')) {
    a.classList.add('active');
  } else {
    a.classList.remove('active');
  }
});

// SCROLL REVEAL
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.section-reveal').forEach(el => revealObserver.observe(el));

// SKILL BARS (about page)
const skillObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const progress = entry.target.querySelector('.skill-progress');
      if (progress) {
        const target = progress.getAttribute('data-width');
        progress.style.width = target;
      }
      entry.target.classList.add('visible');
      skillObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('.skill-item').forEach((el, i) => {
  el.style.transitionDelay = `${i * 80}ms`;
  skillObserver.observe(el);
});

// CONTACT FORM
// Only attach the legacy contact handler when the expected elements exist and
// use the older markup (`.form-submit` and `#successMessage`). The site has a
// newer inline handler in `contact.html` so avoid double-binding which caused
// runtime errors.
const contactForm = document.getElementById('contactForm');
const legacySuccessMsg  = document.getElementById('successMessage');
if (contactForm && contactForm.querySelector('.form-submit') && legacySuccessMsg) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('.form-submit');
    const origText = btn.textContent;
    btn.textContent = 'Sending...';
    btn.disabled = true;

    try {
      const res = await fetch(contactForm.action, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        contactForm.style.display = 'none';
        if (legacySuccessMsg) legacySuccessMsg.classList.add('show');
      } else {
        alert('Something went wrong. Please try again.');
        btn.textContent = origText;
        btn.disabled = false;
      }
    } catch {
      alert('Network error. Please try again.');
      btn.textContent = origText;
      btn.disabled = false;
    }
  });
}

// EMAILJS + CONTACT FORM HANDLER (moved from inline contact.html)
if (typeof emailjs !== 'undefined' && contactForm) {
  // Avoid double-binding if this script is loaded more than once
  if (contactForm.dataset.leadHandlerAttached !== 'true') {
    try { emailjs.init('_oX1oSnKu6syW--Uq'); } catch (e) { /* ignore */ }

    const submitBtn  = document.getElementById('submitBtn');
    const btnText    = document.getElementById('btnText');
    const spinner    = document.getElementById('spinner');
    const successMsg = document.getElementById('successMsg');
    const errorMsg   = document.getElementById('errorMsg');

    function isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function validateForm(name, email, message, consent) {
      if (!name || name.length === 0) {
        return { valid: false, error: 'Please enter your name.' };
      }
      if (name.length < 2) {
        return { valid: false, error: 'Name must be at least 2 characters.' };
      }
      if (!email || email.length === 0) {
        return { valid: false, error: 'Email address is required.' };
      }
      if (!isValidEmail(email)) {
        return { valid: false, error: 'Please enter a valid email address (e.g., user@example.com).' };
      }
      // Additional validation: ensure email has proper format
      if (email.startsWith('.') || email.endsWith('.') || email.includes('..') || email.includes(' ')) {
        return { valid: false, error: 'Email contains invalid characters or formatting.' };
      }
      const atCount = (email.match(/@/g) || []).length;
      if (atCount !== 1) {
        return { valid: false, error: 'Email must contain exactly one @ symbol.' };
      }
      const [localPart, domain] = email.split('@');
      if (!domain.includes('.')) {
        return { valid: false, error: 'Email domain must contain a dot (e.g., example.com).' };
      }
      if (!message || message.length === 0) {
        return { valid: false, error: 'Please enter a message.' };
      }
      if (message.length < 10) {
        return { valid: false, error: 'Message must be at least 10 characters.' };
      }
      if (!consent) {
        return { valid: false, error: 'Please confirm you agree to the privacy policy.' };
      }
      return { valid: true };
    }

    function normalizePhoneE164(cc, raw) {
      if (!raw) return '';
      const digits = raw.replace(/\D/g, '');
      if (!digits) return '';
      const normalized = digits.replace(/^0+/, '');
      return cc + normalized;
    }

    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      // prevent duplicate handling
      if (contactForm.dataset.submitting === 'true') return;

      // Collect values
      const name    = document.getElementById('name').value.trim();
      const email   = document.getElementById('email').value.trim();
      const message = document.getElementById('message').value.trim();
      const phone   = document.getElementById('phone') ? document.getElementById('phone').value.trim() : '';
      const phoneCc = document.getElementById('phone_cc') ? document.getElementById('phone_cc').value || '+44' : '+44';
      const company = document.getElementById('company') ? document.getElementById('company').value.trim() : '';
      const industry= document.getElementById('industry') ? document.getElementById('industry').value || '' : '';
      const consent = document.getElementById('consent') ? document.getElementById('consent').checked : false;

      // Comprehensive validation
      const validation = validateForm(name, email, message, consent);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }

      // Normalize phone to E.164 and set hidden field if present
      const phoneE164 = normalizePhoneE164(phoneCc, phone);
      const e164Field = document.getElementById('phone_e164');
      if (e164Field) e164Field.value = phoneE164;

      // UI state
      contactForm.dataset.submitting = 'true';
      if (btnText) btnText.textContent = 'Sending...';
      if (spinner) spinner.style.display = 'inline-block';
      if (submitBtn) submitBtn.disabled = true;
      if (errorMsg) errorMsg.classList.remove('show');

      // Send via EmailJS first (deliver email)
      emailjs.sendForm('service_ojsencg', 'template_4nrpw0d', contactForm)
        .then(function() {
          const lead = {
            name: name,
            email: email,
            phone: phoneE164,
            company: company,
            industry: industry,
            message: message,
            consent: true,
            received_at: new Date().toISOString()
          };

          // Persist to backend with proper error handling
          fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lead)
          })
            .then(response => {
              if (!response.ok) {
                console.warn('Backend storage error:', response.statusText);
              }
            })
            .catch(err => {
              console.warn('Backend connection error:', err);
            })
            .finally(() => {
              // Show success UI
              contactForm.style.display = 'none';
              if (successMsg) successMsg.classList.add('show');

              // Fire non-PII conversion event
              if (typeof gtag === 'function') {
                try { gtag('event', 'conversion', { 'send_to': 'AW-18263973942/XXXX' }); } catch (err) { /* ignore */ }
              }
            });
        })
        .catch(function(error) {
          console.error('EmailJS error:', error);
          if (errorMsg) errorMsg.classList.add('show');
          if (btnText) btnText.textContent = 'Send Message →';
          if (spinner) spinner.style.display = 'none';
          if (submitBtn) submitBtn.disabled = false;
          contactForm.dataset.submitting = 'false';
        });
    });

    contactForm.dataset.leadHandlerAttached = 'true';
  }
}

// SEARCHABLE COUNTRY CODE DROPDOWN
const countryCodeData = [
  { code: '+44', name: 'GB', display: 'GB +44' },
  { code: '+1', name: 'US', display: 'US +1' },
  { code: '+234', name: 'NG', display: 'NG +234' },
  { code: '+255', name: 'TZ', display: 'TZ +255' },
  { code: '+91', name: 'IN', display: 'IN +91' },
  { code: '+233', name: 'GH', display: 'GH +233' },
  { code: '+49', name: 'DE', display: 'DE +49' },
  { code: '+33', name: 'FR', display: 'FR +33' },
  { code: '+254', name: 'KE', display: 'KE +254' },
  { code: '+27', name: 'ZA', display: 'ZA +27' },
  { code: '+212', name: 'MA', display: 'MA +212' },
  { code: '+256', name: 'UG', display: 'UG +256' },
  { code: '+880', name: 'BD', display: 'BD +880' },
  { code: '+86', name: 'CN', display: 'CN +86' },
  { code: '+81', name: 'JP', display: 'JP +81' },
  { code: '+39', name: 'IT', display: 'IT +39' },
  { code: '+34', name: 'ES', display: 'ES +34' },
  { code: '+44', name: 'UK', display: 'UK +44' },
  { code: '+61', name: 'AU', display: 'AU +61' },
  { code: '+64', name: 'NZ', display: 'NZ +64' },
  { code: '+1', name: 'CA', display: 'CA +1' }
];

const ccInput = document.getElementById('phone_cc_input');
const ccHidden = document.getElementById('phone_cc');
const ccDropdown = document.getElementById('countryCodeDropdown');

function renderCountryCodeOptions(filter = '') {
  ccDropdown.innerHTML = '';
  const filtered = countryCodeData.filter(item => 
    item.display.toLowerCase().includes(filter.toLowerCase())
  );

  if (filtered.length === 0) {
    ccDropdown.innerHTML = '<div style="padding:12px 14px;color:var(--text-muted);text-align:center;">No results found</div>';
    return;
  }

  filtered.forEach(item => {
    const option = document.createElement('div');
    option.className = 'country-code-option';
    option.textContent = item.display;
    option.dataset.code = item.code;
    option.addEventListener('click', () => {
      ccInput.value = item.display;
      ccHidden.value = item.code;
      ccDropdown.classList.remove('active');
    });
    ccDropdown.appendChild(option);
  });
}

if (ccInput) {
  // Render initial options
  renderCountryCodeOptions();

  ccInput.addEventListener('focus', () => {
    ccDropdown.classList.add('active');
  });

  ccInput.addEventListener('input', (e) => {
    renderCountryCodeOptions(e.target.value);
    ccDropdown.classList.add('active');
  });

  ccInput.addEventListener('blur', () => {
    setTimeout(() => {
      ccDropdown.classList.remove('active');
    }, 150);
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!ccInput.contains(e.target) && !ccDropdown.contains(e.target)) {
      ccDropdown.classList.remove('active');
    }
  });
}

// EMAIL VALIDATION
const emailInput = document.getElementById('email');
const emailValidationMsg = document.getElementById('emailValidation');

function validateEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

if (emailInput) {
  emailInput.addEventListener('input', (e) => {
    const email = e.target.value.trim();
    
    if (!email) {
      emailValidationMsg.classList.remove('show');
      return;
    }

    emailValidationMsg.classList.add('show');
    
    if (validateEmailFormat(email)) {
      emailValidationMsg.classList.remove('invalid');
      emailValidationMsg.classList.add('valid');
      emailValidationMsg.textContent = 'Email format is valid';
    } else {
      emailValidationMsg.classList.remove('valid');
      emailValidationMsg.classList.add('invalid');
      emailValidationMsg.textContent = 'Invalid email format';
    }
  });

  emailInput.addEventListener('blur', () => {
    const email = emailInput.value.trim();
    if (!email || validateEmailFormat(email)) {
      emailValidationMsg.classList.remove('show');
    }
  });
}

// GDPR helper: no server-side keys included. For reCAPTCHA integration, add
// the site key in the page and call grecaptcha.execute before submit, then
// verify token server-side. (Not implemented here because keys are required.)