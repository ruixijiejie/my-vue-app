import type { Router, RouteLocationNormalized } from 'vue-router';

import { setRouteChange } from '/@/logics/mitt/routeChange';
import { useTransitionSetting } from '/@/hooks/setting/useTransitionSetting';
import projectSetting from '/@/settings/projectSetting';
import { AxiosCanceler } from '/@/utils/http/axios/axiosCancel';
import { Modal, notification } from 'ant-design-vue';
import { createStateGuard } from './stateGuard';
import { warn } from '/@/utils/log';
import { unref } from 'vue';
import nProgress from 'nprogress';

export function setupRouterGuard(router: Router) {
  createPageGuard(router);
  createHttpGuard(router);
  createScrollGuard(router);
  createMessageGuard(router);
  createProgressGuard(router);
  createStateGuard(router);
}

/**
 * Hooks for handling page state
 */
function createPageGuard(router: Router) {
  const loadedPageMap = new Map<string, boolean>();

  router.beforeEach(async (to) => {
    // The page has already been loaded, it will be faster to open it again, you don’t need to do loading and other processing
    to.meta.loaded = !!loadedPageMap.get(to.path);
    // Notify routing changes
    setRouteChange(to);

    return true;
  });

  router.afterEach((to) => {
    loadedPageMap.set(to.path, true);
  });
}

/**
 * The interface used to close the current page to complete the request when the route is switched
 * @param router
 */
function createHttpGuard(router: Router) {
  const { removeAllHttpPending } = projectSetting;
  let axiosCanceler: Nullable<AxiosCanceler>;
  if (removeAllHttpPending) {
    axiosCanceler = new AxiosCanceler();
  }
  router.beforeEach(async () => {
    // Switching the route will delete the previous request
    axiosCanceler?.removeAllPending();
    return true;
  });
}

/**
 * Routing switch back to the top
 * @param router
 */
function createScrollGuard(router: Router) {
  const isHash = (href: string) => {
    return /^#/.test(href);
  };

  const body = document.body;

  router.afterEach(async (to) => {
    // scroll top
    isHash((to as RouteLocationNormalized & { href: string })?.href) && body.scrollTo(0, 0);
    return true;
  });
}

/**
 * Used to close the message instance when the route is switched
 * @param router
 */
export function createMessageGuard(router: Router) {
  const { closeMessageOnSwitch } = projectSetting;

  router.beforeEach(async () => {
    try {
      if (closeMessageOnSwitch) {
        Modal.destroyAll();
        notification.destroy();
      }
    } catch (error) {
      warn('message guard error:' + error);
    }
    return true;
  });
}

/**
 * progress guard
 * @param router
 */
export function createProgressGuard(router: Router) {
  const { getOpenNProgress } = useTransitionSetting();
  router.beforeEach(async (to) => {
    if (to.meta.loaded) {
      return true;
    }
    unref(getOpenNProgress) && nProgress.start();
    return true;
  });

  router.afterEach(async () => {
    unref(getOpenNProgress) && nProgress.done();
    return true;
  });
}