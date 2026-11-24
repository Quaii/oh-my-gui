const showcase = document.querySelector('[data-showcase]');
const navigation = showcase.querySelector('[data-showcase-nav]');
const tabs = Array.from(navigation.querySelectorAll('[data-view]'));
const panels = tabs.map(tab => document.getElementById(tab.hash.slice(1)));

function selectTab(activeIndex, focus = false) {
  tabs.forEach((tab, index) => {
    const selected = index === activeIndex;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    panels[index].hidden = !selected;
  });

  if (focus) tabs[activeIndex].focus();
}

navigation.setAttribute('role', 'tablist');
tabs.forEach((tab, index) => {
  const panel = panels[index];
  tab.id = `preview-${panel.id}`;
  tab.setAttribute('role', 'tab');
  tab.setAttribute('aria-controls', panel.id);
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', tab.id);

  tab.addEventListener('click', event => {
    event.preventDefault();
    selectTab(index);
  });

  tab.addEventListener('keydown', event => {
    const next = {
      ArrowLeft: (index - 1 + tabs.length) % tabs.length,
      ArrowRight: (index + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    selectTab(next, true);
  });
});

function selectLinkedTab() {
  const linkedTab = panels.findIndex(panel => `#${panel.id}` === location.hash);
  if (linkedTab >= 0) selectTab(linkedTab);
}

selectTab(0);
selectLinkedTab();
window.addEventListener('hashchange', selectLinkedTab);
