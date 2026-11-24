for (const showcase of document.querySelectorAll('[data-showcase]')) {
  const navigation = showcase.querySelector('[data-showcase-nav]');
  const tabs = Array.from(navigation.querySelectorAll('[data-view]'));
  const panels = tabs.map(tab => document.getElementById(tab.hash.slice(1)));
  const mobile = matchMedia('(max-width: 760px)');
  const vertical = () => navigation.classList.contains('tour-sidebar') && !mobile.matches;

  function selectTab(activeIndex, focus = false) {
    tabs.forEach((tab, index) => {
      const selected = index === activeIndex;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[index].hidden = !selected;
    });

    if (focus) tabs[activeIndex].focus();
  }

  function updateOrientation() {
    navigation.setAttribute('aria-orientation', vertical() ? 'vertical' : 'horizontal');
  }

  function selectLinkedTab() {
    const linkedTab = panels.findIndex(panel => '#' + panel.id === location.hash);
    if (linkedTab >= 0) selectTab(linkedTab);
  }

  navigation.setAttribute('role', 'tablist');
  updateOrientation();
  mobile.addEventListener('change', updateOrientation);

  tabs.forEach((tab, index) => {
    const panel = panels[index];
    tab.id = 'preview-' + panel.id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panel.id);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);

    tab.addEventListener('click', event => {
      event.preventDefault();
      selectTab(index);
    });

    tab.addEventListener('keydown', event => {
      const previous = vertical() ? 'ArrowUp' : 'ArrowLeft';
      const next = vertical() ? 'ArrowDown' : 'ArrowRight';
      const target = {
        [previous]: (index - 1 + tabs.length) % tabs.length,
        [next]: (index + 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      }[event.key];
      if (target === undefined) return;
      event.preventDefault();
      selectTab(target, true);
    });
  });

  selectTab(0);
  selectLinkedTab();
  window.addEventListener('hashchange', selectLinkedTab);
}

const pageLinks = Array.from(document.querySelectorAll('.nav a[href^="#"]'))
  .filter(link => ['#workspace', '#appearance', '#get-started'].includes(link.hash));

function updateNavigation() {
  const id = location.hash.slice(1);
  const current = document.getElementById(id)?.closest('main > section, .closing');
  for (const link of pageLinks) {
    if (link.hash === '#' + current?.id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}

updateNavigation();
window.addEventListener('hashchange', updateNavigation);

const menu = document.querySelector('.mobile-navigation');
const menuTrigger = menu.querySelector('summary');
menu.querySelector('nav').addEventListener('click', event => {
  if (event.target.closest('a')) menu.open = false;
});
document.addEventListener('pointerdown', event => {
  if (menu.open && !menu.contains(event.target)) menu.open = false;
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !menu.open) return;
  event.preventDefault();
  menu.open = false;
  menuTrigger.focus();
});
