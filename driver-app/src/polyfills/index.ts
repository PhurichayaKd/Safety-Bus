// src/polyfills/index.ts
// Comprehensive polyfills for React Native web compatibility

if (typeof global !== 'undefined') {
  // Mock element with all necessary DOM methods
  const createMockElement = () => ({
    appendChild: () => {},
    removeChild: () => {},
    insertBefore: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    removeAttribute: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
    style: {},
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false,
      toggle: () => false
    },
    innerHTML: '',
    textContent: '',
    children: [],
    childNodes: [],
    parentNode: null,
    firstChild: null,
    lastChild: null,
    nextSibling: null,
    previousSibling: null,
    nodeType: 1,
    nodeName: 'DIV',
    nodeValue: null
  });

  // Polyfill window
  if (typeof window === 'undefined') {
    const mockElement = createMockElement();
    
    global.window = {
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
      location: { 
        href: 'http://localhost:8083',
        origin: 'http://localhost:8083',
        protocol: 'http:',
        host: 'localhost:8083',
        hostname: 'localhost',
        port: '8083',
        pathname: '/',
        search: '',
        hash: ''
      },
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null
      },
      sessionStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        length: 0,
        key: () => null
      },
      history: {
        pushState: () => {},
        replaceState: () => {},
        back: () => {},
        forward: () => {},
        go: () => {},
        length: 1,
        state: null
      },
      document: {
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => {},
        createElement: () => createMockElement(),
        createTextNode: (text: string) => ({
          ...createMockElement(),
          nodeType: 3,
          nodeName: '#text',
          nodeValue: text,
          textContent: text
        }),
        getElementById: () => null,
        querySelector: () => null,
        querySelectorAll: () => [],
        getElementsByTagName: () => [],
        getElementsByClassName: () => [],
        body: mockElement,
        head: mockElement,
        documentElement: mockElement,
        cookie: '',
        readyState: 'complete',
        visibilityState: 'visible',
        hidden: false,
        title: '',
        location: { href: 'http://localhost:8083', origin: 'http://localhost:8083', protocol: 'http:', host: 'localhost:8083' }
      },
      innerWidth: 1024,
      innerHeight: 768,
      outerWidth: 1024,
      outerHeight: 768,
      screen: {
        width: 1024,
        height: 768,
        availWidth: 1024,
        availHeight: 768
      },
      getComputedStyle: () => ({
        getPropertyValue: () => '',
        setProperty: () => {},
        removeProperty: () => '',
        touchAction: 'auto'
      }),
      requestAnimationFrame: (callback: Function) => setTimeout(callback, 16),
      cancelAnimationFrame: (id: number) => clearTimeout(id)
    } as any;

    global.document = global.window.document;
  }

  // Polyfill document separately if needed
  if (typeof document === 'undefined') {
    global.document = global.window?.document || {
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
      createElement: () => createMockElement(),
      createTextNode: (text: string) => ({
        ...createMockElement(),
        nodeType: 3,
        nodeName: '#text',
        nodeValue: text,
        textContent: text
      }),
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementsByTagName: () => [],
      getElementsByClassName: () => [],
      body: createMockElement(),
      head: createMockElement(),
      documentElement: createMockElement(),
      cookie: '',
      readyState: 'complete',
      visibilityState: 'visible',
      hidden: false,
      title: '',
      location: { href: 'http://localhost:8083', origin: 'http://localhost:8083', protocol: 'http:', host: 'localhost:8083' }
    } as any;
  }

  // Polyfill navigator
  if (typeof navigator === 'undefined') {
    global.navigator = {
      userAgent: 'React Native',
      platform: 'React Native',
      language: 'en-US',
      languages: ['en-US'],
      onLine: true,
      cookieEnabled: true,
      doNotTrack: null,
      hardwareConcurrency: 4,
      maxTouchPoints: 0,
      vendor: '',
      vendorSub: '',
      product: 'ReactNative',
      productSub: '',
      appName: 'ReactNative',
      appVersion: '1.0',
      appCodeName: 'ReactNative'
    } as any;
  }

  // Polyfill CSS and style-related objects
  if (typeof CSSStyleDeclaration === 'undefined') {
    global.CSSStyleDeclaration = function() {} as any;
  }

  if (typeof getComputedStyle === 'undefined') {
    global.getComputedStyle = () => ({
      getPropertyValue: () => '',
      setProperty: () => {},
      removeProperty: () => '',
      touchAction: 'auto'
    }) as any;
  }

  // Polyfill requestAnimationFrame
  if (typeof requestAnimationFrame === 'undefined') {
    global.requestAnimationFrame = (callback: Function) => setTimeout(callback, 16);
    global.cancelAnimationFrame = (id: number) => clearTimeout(id);
  }
}