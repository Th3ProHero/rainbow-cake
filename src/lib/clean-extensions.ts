/**
 * Development utility to clean browser extension attributes
 * that cause hydration warnings
 */

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Clean attributes injected by browser extensions
  const cleanExtensionAttributes = () => {
    const extensionAttributes = [
      'bis_skin_checked',
      'bis_register',
      'data-new-gr-c-s-check-loaded',
      'data-gr-ext-installed',
      '__processed_',
    ];

    document.querySelectorAll('*').forEach((element) => {
      extensionAttributes.forEach((attr) => {
        if (element.hasAttribute(attr)) {
          element.removeAttribute(attr);
        }
        // Also check for dynamic attributes
        Array.from(element.attributes).forEach((attribute) => {
          if (attribute.name.startsWith('__processed_')) {
            element.removeAttribute(attribute.name);
          }
        });
      });
    });
  };

  // Run immediately
  cleanExtensionAttributes();

  // Run on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanExtensionAttributes);
  }

  // Also run periodically in case extensions add attributes dynamically
  const cleanInterval = setInterval(cleanExtensionAttributes, 1000);

  // Stop after React hydrates
  setTimeout(() => clearInterval(cleanInterval), 5000);
}

export {};
