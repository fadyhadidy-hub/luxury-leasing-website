/* ============================================
   Prime Power Leasing - Main JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initScrollAnimations();
  initFAQ();
  initForms();
  setActiveNavLink();
});

/* --- Navigation --- */
function initNavigation() {
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');

  // Scroll behavior
  function handleScroll() {
    if (window.scrollY > 60) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // Mobile toggle
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      links.classList.toggle('open');
      document.body.style.overflow = links.classList.contains('open') ? 'hidden' : '';
    });

    // Close on link click
    links.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('active');
        links.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }
}

/* --- Set Active Nav Link --- */
function setActiveNavLink() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    } else if (currentPage === '' && href === 'index.html') {
      link.classList.add('active');
    }
  });
}

/* --- Scroll Animations --- */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right');

  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  elements.forEach(el => observer.observe(el));
}

/* --- FAQ Accordion --- */
function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
      const item = question.parentElement;
      const isActive = item.classList.contains('active');

      // Close all
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));

      // Toggle clicked
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

/* --- Form Validation --- */
function initForms() {
  document.querySelectorAll('form[data-validate]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      let isValid = true;

      // Clear previous errors
      form.querySelectorAll('.form-group').forEach(g => g.classList.remove('error'));

      // Validate required fields
      form.querySelectorAll('[required]').forEach(field => {
        const group = field.closest('.form-group');
        if (!field.value.trim()) {
          isValid = false;
          if (group) group.classList.add('error');
        }

        // Email validation
        if (field.type === 'email' && field.value.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(field.value.trim())) {
            isValid = false;
            if (group) {
              group.classList.add('error');
              const errorEl = group.querySelector('.form-error');
              if (errorEl) errorEl.textContent = 'Please enter a valid email address.';
            }
          }
        }

        // Phone validation
        if (field.type === 'tel' && field.value.trim()) {
          const phoneRegex = /^[\d\s\-\+\(\)]{7,}$/;
          if (!phoneRegex.test(field.value.trim())) {
            isValid = false;
            if (group) {
              group.classList.add('error');
              const errorEl = group.querySelector('.form-error');
              if (errorEl) errorEl.textContent = 'Please enter a valid phone number.';
            }
          }
        }
      });

      if (isValid) {
        showToast('Your message has been sent successfully. We\'ll be in touch within 24 hours.', 'success');
        form.reset();

        // Reset any conditional sections
        const conditionalSections = form.querySelectorAll('[data-conditional]');
        conditionalSections.forEach(section => {
          section.style.display = 'none';
        });
      } else {
        showToast('Please fill in all required fields correctly.', 'error');
        // Scroll to first error
        const firstError = form.querySelector('.form-group.error');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  });
}

/* --- Toast Notifications --- */
function showToast(message, type = 'success') {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Auto remove
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* --- Utility: Smooth scroll to element --- */
function scrollToElement(selector) {
  const el = document.querySelector(selector);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
