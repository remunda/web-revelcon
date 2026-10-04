(() => {
  const menu = document.querySelector("[data-menu]");
  const openMenu = document.querySelector("[data-menu-open]");
  const closeMenu = document.querySelector("[data-menu-close]");
  const menuLinks = menu?.querySelectorAll("a");
  const stickyTicket = document.querySelector("[data-sticky-ticket]");
  const hero = document.querySelector(".hero");
  let previouslyFocused;
  let shouldRestoreFocus = true;

  function closeMobileMenu(restoreFocus = true) {
    if (!menu?.open) return;
    shouldRestoreFocus = restoreFocus;
    menu.close();
  }

  openMenu?.addEventListener("click", () => {
    // Use the trigger itself rather than relying on browser-specific pointer
    // focus behaviour, so Escape and the close button always have a home.
    previouslyFocused = openMenu;
    menu.showModal();
    openMenu.setAttribute("aria-expanded", "true");
    closeMenu?.focus();
  });

  closeMenu?.addEventListener("click", closeMobileMenu);
  menu?.addEventListener("close", () => {
    openMenu?.setAttribute("aria-expanded", "false");
    const trigger = previouslyFocused;
    previouslyFocused = undefined;
    // Native dialogs complete their own close-focus work after this event.
    // Queue our restoration so Escape and the close button reliably return to
    // the menu trigger. A followed navigation keeps its natural target focus.
    if (shouldRestoreFocus) window.setTimeout(() => trigger?.focus(), 0);
    shouldRestoreFocus = true;
  });
  menu?.addEventListener("click", (event) => {
    if (event.target === menu) closeMobileMenu();
  });
  menuLinks?.forEach((link) => link.addEventListener("click", () => closeMobileMenu(false)));

  if (stickyTicket && hero && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      stickyTicket.classList.toggle("is-visible", !entry.isIntersecting);
    }, { threshold: 0.08 });
    observer.observe(hero);
  }
})();
