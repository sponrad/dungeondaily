class TouchHandler {
  constructor() {
    this.xDown = null;
    this.yDown = null;
    this.minSwipeDistance = 30;

    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);

    document.addEventListener('touchstart', this.handleTouchStart, false);
    document.addEventListener('touchmove', this.handleTouchMove, false);
  }

  handleTouchStart(evt) {
    const firstTouch = evt.touches[0];
    this.xDown = firstTouch.clientX;
    this.yDown = firstTouch.clientY;
  }

  handleTouchMove(evt) {
    if (!this.xDown || !this.yDown) {
      return;
    }

    const xUp = evt.touches[0].clientX;
    const yUp = evt.touches[0].clientY;

    const xDiff = this.xDown - xUp;
    const yDiff = this.yDown - yUp;

    // Determine which direction had the greater movement
    if (Math.abs(xDiff) > Math.abs(yDiff)) {
      if (Math.abs(xDiff) < this.minSwipeDistance) return;

      // Dispatch custom swipe event
      const event = new CustomEvent('swipe', {
        detail: {
          direction: xDiff > 0 ? 'left' : 'right'
        }
      });
      document.dispatchEvent(event);
    } else {
      if (Math.abs(yDiff) < this.minSwipeDistance) return;

      // Dispatch custom swipe event
      const event = new CustomEvent('swipe', {
        detail: {
          direction: yDiff > 0 ? 'up' : 'down'
        }
      });
      document.dispatchEvent(event);
    }

    // Reset values
    this.xDown = null;
    this.yDown = null;
  }
}

// Initialize touch handler when the page loads
window.addEventListener('load', () => {
  new TouchHandler();
});
