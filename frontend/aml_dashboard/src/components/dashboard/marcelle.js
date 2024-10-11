// Adapted from https://github.com/marcellejs/marcelle/tree/main/packages/core/src/layouts/dashboard

import * as most from '@most/core';
import { never } from '@most/core';
import { newDefaultScheduler, asap } from '@most/scheduler';
import { createAdapter } from '@most/adapter';
import 'chartjs-adapter-luxon';


function noop$1() { }
const identity = x => x;
function assign(tar, src) {
    // @ts-ignore
    for (const k in src)
        tar[k] = src[k];
    return tar;
}
// Adapted from https://github.com/then/is-promise/blob/master/index.js
// Distributed under MIT License https://github.com/then/is-promise/blob/master/LICENSE
function is_promise(value) {
    return !!value && (typeof value === 'object' || typeof value === 'function') && typeof value.then === 'function';
}
function run(fn) {
    return fn();
}
function blank_object() {
    return Object.create(null);
}
function run_all(fns) {
    fns.forEach(run);
}
function is_function(thing) {
    return typeof thing === 'function';
}
function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
let src_url_equal_anchor;
function src_url_equal(element_src, url) {
    if (!src_url_equal_anchor) {
        src_url_equal_anchor = document.createElement('a');
    }
    src_url_equal_anchor.href = url;
    return element_src === src_url_equal_anchor.href;
}
function is_empty(obj) {
    return Object.keys(obj).length === 0;
}
function subscribe(store, ...callbacks) {
    if (store == null) {
        return noop$1;
    }
    const unsub = store.subscribe(...callbacks);
    return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function get_store_value(store) {
    let value;
    subscribe(store, _ => value = _)();
    return value;
}
function component_subscribe(component, store, callback) {
    component.$$.on_destroy.push(subscribe(store, callback));
}
function create_slot(definition, ctx, $$scope, fn) {
    if (definition) {
        const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
        return definition[0](slot_ctx);
    }
}
function get_slot_context(definition, ctx, $$scope, fn) {
    return definition[1] && fn
        ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
        : $$scope.ctx;
}
function get_slot_changes(definition, $$scope, dirty, fn) {
    if (definition[2] && fn) {
        const lets = definition[2](fn(dirty));
        if ($$scope.dirty === undefined) {
            return lets;
        }
        if (typeof lets === 'object') {
            const merged = [];
            const len = Math.max($$scope.dirty.length, lets.length);
            for (let i = 0; i < len; i += 1) {
                merged[i] = $$scope.dirty[i] | lets[i];
            }
            return merged;
        }
        return $$scope.dirty | lets;
    }
    return $$scope.dirty;
}
function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
    if (slot_changes) {
        const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
        slot.p(slot_context, slot_changes);
    }
}
function get_all_dirty_from_scope($$scope) {
    if ($$scope.ctx.length > 32) {
        const dirty = [];
        const length = $$scope.ctx.length / 32;
        for (let i = 0; i < length; i++) {
            dirty[i] = -1;
        }
        return dirty;
    }
    return -1;
}
function action_destroyer(action_result) {
    return action_result && is_function(action_result.destroy) ? action_result.destroy : noop$1;
}
function split_css_unit(value) {
    const split = typeof value === 'string' && value.match(/^\s*(-?[\d.]+)([^\s]*)\s*$/);
    return split ? [parseFloat(split[1]), split[2] || 'px'] : [value, 'px'];
}

const is_client = typeof window !== 'undefined';
let now$1 = is_client
    ? () => window.performance.now()
    : () => Date.now();
let raf = is_client ? cb => requestAnimationFrame(cb) : noop$1;

const tasks = new Set();
function run_tasks(now) {
    tasks.forEach(task => {
        if (!task.c(now)) {
            tasks.delete(task);
            task.f();
        }
    });
    if (tasks.size !== 0)
        raf(run_tasks);
}
/**
 * Creates a new task that runs on each raf frame
 * until it returns a falsy value or is aborted
 */
function loop(callback) {
    let task;
    if (tasks.size === 0)
        raf(run_tasks);
    return {
        promise: new Promise(fulfill => {
            tasks.add(task = { c: callback, f: fulfill });
        }),
        abort() {
            tasks.delete(task);
        }
    };
}
function append(target, node) {
    target.appendChild(node);
}
function get_root_for_style(node) {
    if (!node)
        return document;
    const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
    if (root && root.host) {
        return root;
    }
    return node.ownerDocument;
}
function append_empty_stylesheet(node) {
    const style_element = element('style');
    append_stylesheet(get_root_for_style(node), style_element);
    return style_element.sheet;
}
function append_stylesheet(node, style) {
    append(node.head || node, style);
    return style.sheet;
}
function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
}
function detach(node) {
    if (node.parentNode) {
        node.parentNode.removeChild(node);
    }
}
function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}
function element(name) {
    return document.createElement(name);
}
function svg_element(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
}
function text$1(data) {
    return document.createTextNode(data);
}
function space() {
    return text$1(' ');
}
function empty() {
    return text$1('');
}
function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
}
function prevent_default(fn) {
    return function (event) {
        event.preventDefault();
        // @ts-ignore
        return fn.call(this, event);
    };
}
function stop_propagation(fn) {
    return function (event) {
        event.stopPropagation();
        // @ts-ignore
        return fn.call(this, event);
    };
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function set_custom_element_data(node, prop, value) {
    if (prop in node) {
        node[prop] = typeof node[prop] === 'boolean' && value === '' ? true : value;
    }
    else {
        attr(node, prop, value);
    }
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.data === data)
        return;
    text.data = data;
}
function set_input_value(input, value) {
    input.value = value == null ? '' : value;
}
function set_style(node, key, value, important) {
    if (value === null) {
        node.style.removeProperty(key);
    }
    else {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
}
function select_option(select, value, mounting) {
    for (let i = 0; i < select.options.length; i += 1) {
        const option = select.options[i];
        if (option.__value === value) {
            option.selected = true;
            return;
        }
    }
    if (!mounting || value !== undefined) {
        select.selectedIndex = -1; // no option should be selected
    }
}
function select_value(select) {
    const selected_option = select.querySelector(':checked');
    return selected_option && selected_option.__value;
}
// unfortunately this can't be a constant as that wouldn't be tree-shakeable
// so we cache the result instead
let crossorigin;
function is_crossorigin() {
    if (crossorigin === undefined) {
        crossorigin = false;
        try {
            if (typeof window !== 'undefined' && window.parent) {
                void window.parent.document;
            }
        }
        catch (error) {
            crossorigin = true;
        }
    }
    return crossorigin;
}
function add_resize_listener(node, fn) {
    const computed_style = getComputedStyle(node);
    if (computed_style.position === 'static') {
        node.style.position = 'relative';
    }
    const iframe = element('iframe');
    iframe.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ' +
        'overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: -1;');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    const crossorigin = is_crossorigin();
    let unsubscribe;
    if (crossorigin) {
        iframe.src = "data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>";
        unsubscribe = listen(window, 'message', (event) => {
            if (event.source === iframe.contentWindow)
                fn();
        });
    }
    else {
        iframe.src = 'about:blank';
        iframe.onload = () => {
            unsubscribe = listen(iframe.contentWindow, 'resize', fn);
            // make sure an initial resize event is fired _after_ the iframe is loaded (which is asynchronous)
            // see https://github.com/sveltejs/svelte/issues/4233
            fn();
        };
    }
    append(node, iframe);
    return () => {
        if (crossorigin) {
            unsubscribe();
        }
        else if (unsubscribe && iframe.contentWindow) {
            unsubscribe();
        }
        detach(iframe);
    };
}
function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
}
function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
    const e = document.createEvent('CustomEvent');
    e.initCustomEvent(type, bubbles, cancelable, detail);
    return e;
}
class HtmlTag {
    constructor(is_svg = false) {
        this.is_svg = false;
        this.is_svg = is_svg;
        this.e = this.n = null;
    }
    c(html) {
        this.h(html);
    }
    m(html, target, anchor = null) {
        if (!this.e) {
            if (this.is_svg)
                this.e = svg_element(target.nodeName);
            /** #7364  target for <template> may be provided as #document-fragment(11) */
            else
                this.e = element((target.nodeType === 11 ? 'TEMPLATE' : target.nodeName));
            this.t = target.tagName !== 'TEMPLATE' ? target : target.content;
            this.c(html);
        }
        this.i(anchor);
    }
    h(html) {
        this.e.innerHTML = html;
        this.n = Array.from(this.e.nodeName === 'TEMPLATE' ? this.e.content.childNodes : this.e.childNodes);
    }
    i(anchor) {
        for (let i = 0; i < this.n.length; i += 1) {
            insert(this.t, this.n[i], anchor);
        }
    }
    p(html) {
        this.d();
        this.h(html);
        this.i(this.a);
    }
    d() {
        this.n.forEach(detach);
    }
}

// we need to store the information for multiple documents because a Svelte application could also contain iframes
// https://github.com/sveltejs/svelte/issues/3624
const managed_styles = new Map();
let active = 0;
// https://github.com/darkskyapp/string-hash/blob/master/index.js
function hash(str) {
    let hash = 5381;
    let i = str.length;
    while (i--)
        hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
    return hash >>> 0;
}
function create_style_information(doc, node) {
    const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
    managed_styles.set(doc, info);
    return info;
}
function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
    const step = 16.666 / duration;
    let keyframes = '{\n';
    for (let p = 0; p <= 1; p += step) {
        const t = a + (b - a) * ease(p);
        keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
    }
    const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
    const name = `__svelte_${hash(rule)}_${uid}`;
    const doc = get_root_for_style(node);
    const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
    if (!rules[name]) {
        rules[name] = true;
        stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
    }
    const animation = node.style.animation || '';
    node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
    active += 1;
    return name;
}
function delete_rule(node, name) {
    const previous = (node.style.animation || '').split(', ');
    const next = previous.filter(name
        ? anim => anim.indexOf(name) < 0 // remove specific animation
        : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
    );
    const deleted = previous.length - next.length;
    if (deleted) {
        node.style.animation = next.join(', ');
        active -= deleted;
        if (!active)
            clear_rules();
    }
}
function clear_rules() {
    raf(() => {
        if (active)
            return;
        managed_styles.forEach(info => {
            const { ownerNode } = info.stylesheet;
            // there is no ownerNode if it runs on jsdom.
            if (ownerNode)
                detach(ownerNode);
        });
        managed_styles.clear();
    });
}

function create_animation(node, from, fn, params) {
    if (!from)
        return noop$1;
    const to = node.getBoundingClientRect();
    if (from.left === to.left && from.right === to.right && from.top === to.top && from.bottom === to.bottom)
        return noop$1;
    const { delay = 0, duration = 300, easing = identity, 
    // @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
    start: start_time = now$1() + delay, 
    // @ts-ignore todo:
    end = start_time + duration, tick = noop$1, css } = fn(node, { from, to }, params);
    let running = true;
    let started = false;
    let name;
    function start() {
        if (css) {
            name = create_rule(node, 0, 1, duration, delay, easing, css);
        }
        if (!delay) {
            started = true;
        }
    }
    function stop() {
        if (css)
            delete_rule(node, name);
        running = false;
    }
    loop(now => {
        if (!started && now >= start_time) {
            started = true;
        }
        if (started && now >= end) {
            tick(1, 0);
            stop();
        }
        if (!running) {
            return false;
        }
        if (started) {
            const p = now - start_time;
            const t = 0 + 1 * easing(p / duration);
            tick(t, 1 - t);
        }
        return true;
    });
    start();
    tick(0, 1);
    return stop;
}
function fix_position(node) {
    const style = getComputedStyle(node);
    if (style.position !== 'absolute' && style.position !== 'fixed') {
        const { width, height } = style;
        const a = node.getBoundingClientRect();
        node.style.position = 'absolute';
        node.style.width = width;
        node.style.height = height;
        add_transform(node, a);
    }
}
function add_transform(node, a) {
    const b = node.getBoundingClientRect();
    if (a.left !== b.left || a.top !== b.top) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
    }
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error('Function called outside component initialization');
    return current_component;
}
/**
 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
 * it can be called from an external module).
 *
 * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
 *
 * https://svelte.dev/docs#run-time-svelte-onmount
 */
function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
}
/**
 * Schedules a callback to run immediately after the component has been updated.
 *
 * The first time the callback runs will be after the initial `onMount`
 */
function afterUpdate(fn) {
    get_current_component().$$.after_update.push(fn);
}
/**
 * Schedules a callback to run immediately before the component is unmounted.
 *
 * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
 * only one that runs inside a server-side component.
 *
 * https://svelte.dev/docs#run-time-svelte-ondestroy
 */
function onDestroy(fn) {
    get_current_component().$$.on_destroy.push(fn);
}
/**
 * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
 * Event dispatchers are functions that can take two arguments: `name` and `detail`.
 *
 * Component events created with `createEventDispatcher` create a
 * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
 * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
 * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
 * property and can contain any type of data.
 *
 * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
 */
function createEventDispatcher() {
    const component = get_current_component();
    return (type, detail, { cancelable = false } = {}) => {
        const callbacks = component.$$.callbacks[type];
        if (callbacks) {
            // TODO are there situations where events could be dispatched
            // in a server (non-DOM) environment?
            const event = custom_event(type, detail, { cancelable });
            callbacks.slice().forEach(fn => {
                fn.call(component, event);
            });
            return !event.defaultPrevented;
        }
        return true;
    };
}
/**
 * Associates an arbitrary `context` object with the current component and the specified `key`
 * and returns that object. The context is then available to children of the component
 * (including slotted content) with `getContext`.
 *
 * Like lifecycle functions, this must be called during component initialisation.
 *
 * https://svelte.dev/docs#run-time-svelte-setcontext
 */
function setContext(key, context) {
    get_current_component().$$.context.set(key, context);
    return context;
}
/**
 * Retrieves the context that belongs to the closest parent component with the specified `key`.
 * Must be called during component initialisation.
 *
 * https://svelte.dev/docs#run-time-svelte-getcontext
 */
function getContext(key) {
    return get_current_component().$$.context.get(key);
}
// TODO figure out if we still want to support
// shorthand events, or if we want to implement
// a real bubbling mechanism
function bubble(component, event) {
    const callbacks = component.$$.callbacks[event.type];
    if (callbacks) {
        // @ts-ignore
        callbacks.slice().forEach(fn => fn.call(this, event));
    }
}

const dirty_components = [];
const binding_callbacks = [];
let render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = /* @__PURE__ */ Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function tick() {
    schedule_update();
    return resolved_promise;
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
function add_flush_callback(fn) {
    flush_callbacks.push(fn);
}
// flush() calls callbacks in this order:
// 1. All beforeUpdate callbacks, in order: parents before children
// 2. All bind:this callbacks, in reverse order: children before parents.
// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
//    for afterUpdates called during the initial onMount, which are called in
//    reverse order: children before parents.
// Since callbacks might update component values, which could trigger another
// call to flush(), the following steps guard against this:
// 1. During beforeUpdate, any updated components will be added to the
//    dirty_components array and will cause a reentrant call to flush(). Because
//    the flush index is kept outside the function, the reentrant call will pick
//    up where the earlier call left off and go through all dirty components. The
//    current_component value is saved and restored so that the reentrant call will
//    not interfere with the "parent" flush() call.
// 2. bind:this callbacks cannot trigger new flush() calls.
// 3. During afterUpdate, any updated components will NOT have their afterUpdate
//    callback called a second time; the seen_callbacks set, outside the flush()
//    function, guarantees this behavior.
const seen_callbacks = new Set();
let flushidx = 0; // Do *not* move this inside the flush() function
function flush() {
    // Do not reenter flush while dirty components are updated, as this can
    // result in an infinite loop. Instead, let the inner flush handle it.
    // Reentrancy is ok afterwards for bindings etc.
    if (flushidx !== 0) {
        return;
    }
    const saved_component = current_component;
    do {
        // first, call beforeUpdate functions
        // and update components
        try {
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
        }
        catch (e) {
            // reset dirty state to not end up in a deadlocked state and then rethrow
            dirty_components.length = 0;
            flushidx = 0;
            throw e;
        }
        set_current_component(null);
        dirty_components.length = 0;
        flushidx = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                // ...so guard against infinite loops
                seen_callbacks.add(callback);
                callback();
            }
        }
        render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
        flush_callbacks.pop()();
    }
    update_scheduled = false;
    seen_callbacks.clear();
    set_current_component(saved_component);
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
/**
 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
 */
function flush_render_callbacks(fns) {
    const filtered = [];
    const targets = [];
    render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
    targets.forEach((c) => c());
    render_callbacks = filtered;
}

let promise;
function wait() {
    if (!promise) {
        promise = Promise.resolve();
        promise.then(() => {
            promise = null;
        });
    }
    return promise;
}
function dispatch(node, direction, kind) {
    node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
}
const outroing = new Set();
let outros;
function group_outros() {
    outros = {
        r: 0,
        c: [],
        p: outros // parent group
    };
}
function check_outros() {
    if (!outros.r) {
        run_all(outros.c);
    }
    outros = outros.p;
}
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function transition_out(block, local, detach, callback) {
    if (block && block.o) {
        if (outroing.has(block))
            return;
        outroing.add(block);
        outros.c.push(() => {
            outroing.delete(block);
            if (callback) {
                if (detach)
                    block.d(1);
                callback();
            }
        });
        block.o(local);
    }
    else if (callback) {
        callback();
    }
}
const null_transition = { duration: 0 };
function create_in_transition(node, fn, params) {
    const options = { direction: 'in' };
    let config = fn(node, params, options);
    let running = false;
    let animation_name;
    let task;
    let uid = 0;
    function cleanup() {
        if (animation_name)
            delete_rule(node, animation_name);
    }
    function go() {
        const { delay = 0, duration = 300, easing = identity, tick = noop$1, css } = config || null_transition;
        if (css)
            animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
        tick(0, 1);
        const start_time = now$1() + delay;
        const end_time = start_time + duration;
        if (task)
            task.abort();
        running = true;
        add_render_callback(() => dispatch(node, true, 'start'));
        task = loop(now => {
            if (running) {
                if (now >= end_time) {
                    tick(1, 0);
                    dispatch(node, true, 'end');
                    cleanup();
                    return running = false;
                }
                if (now >= start_time) {
                    const t = easing((now - start_time) / duration);
                    tick(t, 1 - t);
                }
            }
            return running;
        });
    }
    let started = false;
    return {
        start() {
            if (started)
                return;
            started = true;
            delete_rule(node);
            if (is_function(config)) {
                config = config(options);
                wait().then(go);
            }
            else {
                go();
            }
        },
        invalidate() {
            started = false;
        },
        end() {
            if (running) {
                cleanup();
                running = false;
            }
        }
    };
}
function create_out_transition(node, fn, params) {
    const options = { direction: 'out' };
    let config = fn(node, params, options);
    let running = true;
    let animation_name;
    const group = outros;
    group.r += 1;
    function go() {
        const { delay = 0, duration = 300, easing = identity, tick = noop$1, css } = config || null_transition;
        if (css)
            animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
        const start_time = now$1() + delay;
        const end_time = start_time + duration;
        add_render_callback(() => dispatch(node, false, 'start'));
        loop(now => {
            if (running) {
                if (now >= end_time) {
                    tick(0, 1);
                    dispatch(node, false, 'end');
                    if (!--group.r) {
                        // this will result in `end()` being called,
                        // so we don't need to clean up here
                        run_all(group.c);
                    }
                    return false;
                }
                if (now >= start_time) {
                    const t = easing((now - start_time) / duration);
                    tick(1 - t, t);
                }
            }
            return running;
        });
    }
    if (is_function(config)) {
        wait().then(() => {
            // @ts-ignore
            config = config(options);
            go();
        });
    }
    else {
        go();
    }
    return {
        end(reset) {
            if (reset && config.tick) {
                config.tick(1, 0);
            }
            if (running) {
                if (animation_name)
                    delete_rule(node, animation_name);
                running = false;
            }
        }
    };
}
function create_bidirectional_transition(node, fn, params, intro) {
    const options = { direction: 'both' };
    let config = fn(node, params, options);
    let t = intro ? 0 : 1;
    let running_program = null;
    let pending_program = null;
    let animation_name = null;
    function clear_animation() {
        if (animation_name)
            delete_rule(node, animation_name);
    }
    function init(program, duration) {
        const d = (program.b - t);
        duration *= Math.abs(d);
        return {
            a: t,
            b: program.b,
            d,
            duration,
            start: program.start,
            end: program.start + duration,
            group: program.group
        };
    }
    function go(b) {
        const { delay = 0, duration = 300, easing = identity, tick = noop$1, css } = config || null_transition;
        const program = {
            start: now$1() + delay,
            b
        };
        if (!b) {
            // @ts-ignore todo: improve typings
            program.group = outros;
            outros.r += 1;
        }
        if (running_program || pending_program) {
            pending_program = program;
        }
        else {
            // if this is an intro, and there's a delay, we need to do
            // an initial tick and/or apply CSS animation immediately
            if (css) {
                clear_animation();
                animation_name = create_rule(node, t, b, duration, delay, easing, css);
            }
            if (b)
                tick(0, 1);
            running_program = init(program, duration);
            add_render_callback(() => dispatch(node, b, 'start'));
            loop(now => {
                if (pending_program && now > pending_program.start) {
                    running_program = init(pending_program, duration);
                    pending_program = null;
                    dispatch(node, running_program.b, 'start');
                    if (css) {
                        clear_animation();
                        animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                    }
                }
                if (running_program) {
                    if (now >= running_program.end) {
                        tick(t = running_program.b, 1 - t);
                        dispatch(node, running_program.b, 'end');
                        if (!pending_program) {
                            // we're done
                            if (running_program.b) {
                                // intro — we can tidy up immediately
                                clear_animation();
                            }
                            else {
                                // outro — needs to be coordinated
                                if (!--running_program.group.r)
                                    run_all(running_program.group.c);
                            }
                        }
                        running_program = null;
                    }
                    else if (now >= running_program.start) {
                        const p = now - running_program.start;
                        t = running_program.a + running_program.d * easing(p / running_program.duration);
                        tick(t, 1 - t);
                    }
                }
                return !!(running_program || pending_program);
            });
        }
    }
    return {
        run(b) {
            if (is_function(config)) {
                wait().then(() => {
                    // @ts-ignore
                    config = config(options);
                    go(b);
                });
            }
            else {
                go(b);
            }
        },
        end() {
            clear_animation();
            running_program = pending_program = null;
        }
    };
}

function handle_promise(promise, info) {
    const token = info.token = {};
    function update(type, index, key, value) {
        if (info.token !== token)
            return;
        info.resolved = value;
        let child_ctx = info.ctx;
        if (key !== undefined) {
            child_ctx = child_ctx.slice();
            child_ctx[key] = value;
        }
        const block = type && (info.current = type)(child_ctx);
        let needs_flush = false;
        if (info.block) {
            if (info.blocks) {
                info.blocks.forEach((block, i) => {
                    if (i !== index && block) {
                        group_outros();
                        transition_out(block, 1, 1, () => {
                            if (info.blocks[i] === block) {
                                info.blocks[i] = null;
                            }
                        });
                        check_outros();
                    }
                });
            }
            else {
                info.block.d(1);
            }
            block.c();
            transition_in(block, 1);
            block.m(info.mount(), info.anchor);
            needs_flush = true;
        }
        info.block = block;
        if (info.blocks)
            info.blocks[index] = block;
        if (needs_flush) {
            flush();
        }
    }
    if (is_promise(promise)) {
        const current_component = get_current_component();
        promise.then(value => {
            set_current_component(current_component);
            update(info.then, 1, info.value, value);
            set_current_component(null);
        }, error => {
            set_current_component(current_component);
            update(info.catch, 2, info.error, error);
            set_current_component(null);
            if (!info.hasCatch) {
                throw error;
            }
        });
        // if we previously had a then/catch block, destroy it
        if (info.current !== info.pending) {
            update(info.pending, 0);
            return true;
        }
    }
    else {
        if (info.current !== info.then) {
            update(info.then, 1, info.value, promise);
            return true;
        }
        info.resolved = promise;
    }
}
function update_await_block_branch(info, ctx, dirty) {
    const child_ctx = ctx.slice();
    const { resolved } = info;
    if (info.current === info.then) {
        child_ctx[info.value] = resolved;
    }
    if (info.current === info.catch) {
        child_ctx[info.error] = resolved;
    }
    info.block.p(child_ctx, dirty);
}

const globals = (typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
        ? globalThis
        : global);
function outro_and_destroy_block(block, lookup) {
    transition_out(block, 1, 1, () => {
        lookup.delete(block.key);
    });
}
function fix_and_outro_and_destroy_block(block, lookup) {
    block.f();
    outro_and_destroy_block(block, lookup);
}
function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
    let o = old_blocks.length;
    let n = list.length;
    let i = o;
    const old_indexes = {};
    while (i--)
        old_indexes[old_blocks[i].key] = i;
    const new_blocks = [];
    const new_lookup = new Map();
    const deltas = new Map();
    const updates = [];
    i = n;
    while (i--) {
        const child_ctx = get_context(ctx, list, i);
        const key = get_key(child_ctx);
        let block = lookup.get(key);
        if (!block) {
            block = create_each_block(key, child_ctx);
            block.c();
        }
        else if (dynamic) {
            // defer updates until all the DOM shuffling is done
            updates.push(() => block.p(child_ctx, dirty));
        }
        new_lookup.set(key, new_blocks[i] = block);
        if (key in old_indexes)
            deltas.set(key, Math.abs(i - old_indexes[key]));
    }
    const will_move = new Set();
    const did_move = new Set();
    function insert(block) {
        transition_in(block, 1);
        block.m(node, next);
        lookup.set(block.key, block);
        next = block.first;
        n--;
    }
    while (o && n) {
        const new_block = new_blocks[n - 1];
        const old_block = old_blocks[o - 1];
        const new_key = new_block.key;
        const old_key = old_block.key;
        if (new_block === old_block) {
            // do nothing
            next = new_block.first;
            o--;
            n--;
        }
        else if (!new_lookup.has(old_key)) {
            // remove old block
            destroy(old_block, lookup);
            o--;
        }
        else if (!lookup.has(new_key) || will_move.has(new_key)) {
            insert(new_block);
        }
        else if (did_move.has(old_key)) {
            o--;
        }
        else if (deltas.get(new_key) > deltas.get(old_key)) {
            did_move.add(new_key);
            insert(new_block);
        }
        else {
            will_move.add(old_key);
            o--;
        }
    }
    while (o--) {
        const old_block = old_blocks[o];
        if (!new_lookup.has(old_block.key))
            destroy(old_block, lookup);
    }
    while (n)
        insert(new_blocks[n - 1]);
    run_all(updates);
    return new_blocks;
}

function bind(component, name, callback) {
    const index = component.$$.props[name];
    if (index !== undefined) {
        component.$$.bound[index] = callback;
        callback(component.$$.ctx[index]);
    }
}
function create_component(block) {
    block && block.c();
}
function mount_component(component, target, anchor, customElement) {
    const { fragment, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    if (!customElement) {
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
            // if the component was destroyed immediately
            // it will update the `$$.on_destroy` reference to `null`.
            // the destructured on_destroy may still reference to the old array
            if (component.$$.on_destroy) {
                component.$$.on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
    }
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        flush_render_callbacks($$.after_update);
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
        // preserve final state?)
        $$.on_destroy = $$.fragment = null;
        $$.ctx = [];
    }
}
function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
        dirty_components.push(component);
        schedule_update();
        component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = component.$$ = {
        fragment: null,
        ctx: [],
        // state
        props,
        update: noop$1,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        on_disconnect: [],
        before_update: [],
        after_update: [],
        context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false,
        root: options.target || parent_component.$$.root
    };
    append_styles && append_styles($$.root);
    let ready = false;
    $$.ctx = instance
        ? instance(component, options.props || {}, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor, options.customElement);
        flush();
    }
    set_current_component(parent_component);
}
/**
 * Base class for Svelte components. Used when dev=false.
 */
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop$1;
    }
    $on(type, callback) {
        if (!is_function(callback)) {
            return noop$1;
        }
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set($$props) {
        if (this.$$set && !is_empty($$props)) {
            this.$$.skip_bound = true;
            this.$$set($$props);
            this.$$.skip_bound = false;
        }
    }
}

/* ../design-system/dist/Button.svelte generated by Svelte v3.58.0 */

function create_fragment$14(ctx) {
	let t;
	let button;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[10].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], null);

	return {
		c() {
			t = space();
			button = element("button");
			if (default_slot) default_slot.c();
			attr(button, "class", "marcelle svelte-2j0fl0");
			button.disabled = /*disabled*/ ctx[1];
			toggle_class(button, "outline", /*variant*/ ctx[0] === 'outline');
			toggle_class(button, "filled", /*variant*/ ctx[0] === 'filled');
			toggle_class(button, "light", /*variant*/ ctx[0] === 'light');
			toggle_class(button, "success", /*type*/ ctx[2] === 'success');
			toggle_class(button, "warning", /*type*/ ctx[2] === 'warning');
			toggle_class(button, "danger", /*type*/ ctx[2] === 'danger');
			toggle_class(button, "size-small", /*size*/ ctx[3] === 'small');
			toggle_class(button, "size-large", /*size*/ ctx[3] === 'large');
			toggle_class(button, "round", /*round*/ ctx[4]);
		},
		m(target, anchor) {
			insert(target, t, anchor);
			insert(target, button, anchor);

			if (default_slot) {
				default_slot.m(button, null);
			}

			current = true;

			if (!mounted) {
				dispose = [
					listen(document.body, "mouseup", /*stopDown*/ ctx[6]),
					listen(document.body, "touchend", /*stopDown*/ ctx[6]),
					listen(button, "click", /*click_handler*/ ctx[11]),
					listen(button, "mousedown", /*startDown*/ ctx[5]),
					listen(button, "touchstart", prevent_default(/*startDown*/ ctx[5])),
					listen(button, "touchend", /*fireClick*/ ctx[7])
				];

				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 512)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[9],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[9])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[9], dirty, null),
						null
					);
				}
			}

			if (!current || dirty & /*disabled*/ 2) {
				button.disabled = /*disabled*/ ctx[1];
			}

			if (!current || dirty & /*variant*/ 1) {
				toggle_class(button, "outline", /*variant*/ ctx[0] === 'outline');
			}

			if (!current || dirty & /*variant*/ 1) {
				toggle_class(button, "filled", /*variant*/ ctx[0] === 'filled');
			}

			if (!current || dirty & /*variant*/ 1) {
				toggle_class(button, "light", /*variant*/ ctx[0] === 'light');
			}

			if (!current || dirty & /*type*/ 4) {
				toggle_class(button, "success", /*type*/ ctx[2] === 'success');
			}

			if (!current || dirty & /*type*/ 4) {
				toggle_class(button, "warning", /*type*/ ctx[2] === 'warning');
			}

			if (!current || dirty & /*type*/ 4) {
				toggle_class(button, "danger", /*type*/ ctx[2] === 'danger');
			}

			if (!current || dirty & /*size*/ 8) {
				toggle_class(button, "size-small", /*size*/ ctx[3] === 'small');
			}

			if (!current || dirty & /*size*/ 8) {
				toggle_class(button, "size-large", /*size*/ ctx[3] === 'large');
			}

			if (!current || dirty & /*round*/ 16) {
				toggle_class(button, "round", /*round*/ ctx[4]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(t);
			if (detaching) detach(button);
			if (default_slot) default_slot.d(detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

function instance$13($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	let { variant = "outline" } = $$props;
	let { disabled = false } = $$props;
	let { type = "default" } = $$props;
	let { size = "medium" } = $$props;
	let { round = false } = $$props;
	let { pressed = false } = $$props;
	const dispatch = createEventDispatcher();

	function startDown() {
		$$invalidate(8, pressed = true);
		dispatch("pressed", pressed);
	}

	function stopDown() {
		if (pressed) {
			$$invalidate(8, pressed = false);
			dispatch("pressed", pressed);
		}
	}

	function fireClick(e) {
		dispatch("click", e);
	}

	function click_handler(event) {
		bubble.call(this, $$self, event);
	}

	$$self.$$set = $$props => {
		if ('variant' in $$props) $$invalidate(0, variant = $$props.variant);
		if ('disabled' in $$props) $$invalidate(1, disabled = $$props.disabled);
		if ('type' in $$props) $$invalidate(2, type = $$props.type);
		if ('size' in $$props) $$invalidate(3, size = $$props.size);
		if ('round' in $$props) $$invalidate(4, round = $$props.round);
		if ('pressed' in $$props) $$invalidate(8, pressed = $$props.pressed);
		if ('$$scope' in $$props) $$invalidate(9, $$scope = $$props.$$scope);
	};

	return [
		variant,
		disabled,
		type,
		size,
		round,
		startDown,
		stopDown,
		fireClick,
		pressed,
		$$scope,
		slots,
		click_handler
	];
}

let Button$1 = class Button extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$13, create_fragment$14, safe_not_equal, {
			variant: 0,
			disabled: 1,
			type: 2,
			size: 3,
			round: 4,
			pressed: 8
		});
	}
};

/* ../design-system/dist/Notification.svelte generated by Svelte v3.58.0 */

function get_each_context$h(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[6] = list[i].title;
	child_ctx[7] = list[i].message;
	child_ctx[8] = list[i].type;
	child_ctx[9] = list[i].id;
	return child_ctx;
}

// (54:40) 
function create_if_block_1$j(ctx) {
	let path;

	return {
		c() {
			path = svg_element("path");
			attr(path, "d", "M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0\n                4.34 4.34a8 8 0 0 0 11.32 11.32zM9 5h2v6H9V5zm0 8h2v2H9v-2z");
		},
		m(target, anchor) {
			insert(target, path, anchor);
		},
		d(detaching) {
			if (detaching) detach(path);
		}
	};
}

// (49:12) {#if type === 'default'}
function create_if_block$E(ctx) {
	let path;

	return {
		c() {
			path = svg_element("path");
			attr(path, "d", "M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0\n                4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z");
		},
		m(target, anchor) {
			insert(target, path, anchor);
		},
		d(detaching) {
			if (detaching) detach(path);
		}
	};
}

// (31:2) {#each notifications.slice(0, 10) as { title, message, type, id }
function create_each_block$h(key_1, ctx) {
	let div4;
	let div3;
	let div0;
	let svg0;
	let t0;
	let div1;
	let p0;
	let t1_value = /*title*/ ctx[6] + "";
	let t1;
	let t2;
	let p1;
	let t3_value = /*message*/ ctx[7] + "";
	let t3;
	let t4;
	let div2;
	let svg1;
	let title;
	let t5;
	let path;
	let t6;
	let div4_transition;
	let rect;
	let stop_animation = noop$1;
	let current;
	let mounted;
	let dispose;

	function select_block_type(ctx, dirty) {
		if (/*type*/ ctx[8] === 'default') return create_if_block$E;
		if (/*type*/ ctx[8] === 'danger') return create_if_block_1$j;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type && current_block_type(ctx);

	function click_handler() {
		return /*click_handler*/ ctx[3](/*id*/ ctx[9]);
	}

	function keypress_handler(...args) {
		return /*keypress_handler*/ ctx[4](/*id*/ ctx[9], ...args);
	}

	return {
		key: key_1,
		first: null,
		c() {
			div4 = element("div");
			div3 = element("div");
			div0 = element("div");
			svg0 = svg_element("svg");
			if (if_block) if_block.c();
			t0 = space();
			div1 = element("div");
			p0 = element("p");
			t1 = text$1(t1_value);
			t2 = space();
			p1 = element("p");
			t3 = text$1(t3_value);
			t4 = space();
			div2 = element("div");
			svg1 = svg_element("svg");
			title = svg_element("title");
			t5 = text$1("Close");
			path = svg_element("path");
			t6 = space();
			attr(svg0, "class", "notification-svg mr-4 svelte-c58nio");
			attr(svg0, "xmlns", "http://www.w3.org/2000/svg");
			attr(svg0, "viewBox", "0 0 20 20");
			toggle_class(svg0, "default", /*type*/ ctx[8] === 'default');
			toggle_class(svg0, "danger", /*type*/ ctx[8] === 'danger');
			attr(div0, "class", "py-1");
			attr(p0, "class", "my-1 font-bold");
			attr(p1, "class", "my-1 text-sm");
			attr(path, "d", "M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1\n              1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10\n              8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0\n              1.698z");
			attr(svg1, "class", "notification-svg ml-4 cursor-pointer svelte-c58nio");
			attr(svg1, "role", "button");
			attr(svg1, "xmlns", "http://www.w3.org/2000/svg");
			attr(svg1, "viewBox", "0 0 20 20");
			toggle_class(svg1, "default", /*type*/ ctx[8] === 'default');
			toggle_class(svg1, "danger", /*type*/ ctx[8] === 'danger');
			attr(div3, "class", "flex items-start");
			attr(div4, "class", "notification-card svelte-c58nio");
			attr(div4, "role", "alert");
			toggle_class(div4, "default", /*type*/ ctx[8] === 'default');
			toggle_class(div4, "danger", /*type*/ ctx[8] === 'danger');
			this.first = div4;
		},
		m(target, anchor) {
			insert(target, div4, anchor);
			append(div4, div3);
			append(div3, div0);
			append(div0, svg0);
			if (if_block) if_block.m(svg0, null);
			append(div3, t0);
			append(div3, div1);
			append(div1, p0);
			append(p0, t1);
			append(div1, t2);
			append(div1, p1);
			append(p1, t3);
			append(div3, t4);
			append(div3, div2);
			append(div2, svg1);
			append(svg1, title);
			append(title, t5);
			append(svg1, path);
			append(div4, t6);
			current = true;

			if (!mounted) {
				dispose = [
					listen(svg1, "click", click_handler),
					listen(svg1, "keypress", prevent_default(keypress_handler))
				];

				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
				if (if_block) if_block.d(1);
				if_block = current_block_type && current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(svg0, null);
				}
			}

			if (!current || dirty & /*notifications*/ 1) {
				toggle_class(svg0, "default", /*type*/ ctx[8] === 'default');
			}

			if (!current || dirty & /*notifications*/ 1) {
				toggle_class(svg0, "danger", /*type*/ ctx[8] === 'danger');
			}

			if ((!current || dirty & /*notifications*/ 1) && t1_value !== (t1_value = /*title*/ ctx[6] + "")) set_data(t1, t1_value);
			if ((!current || dirty & /*notifications*/ 1) && t3_value !== (t3_value = /*message*/ ctx[7] + "")) set_data(t3, t3_value);

			if (!current || dirty & /*notifications*/ 1) {
				toggle_class(svg1, "default", /*type*/ ctx[8] === 'default');
			}

			if (!current || dirty & /*notifications*/ 1) {
				toggle_class(svg1, "danger", /*type*/ ctx[8] === 'danger');
			}

			if (!current || dirty & /*notifications*/ 1) {
				toggle_class(div4, "default", /*type*/ ctx[8] === 'default');
			}

			if (!current || dirty & /*notifications*/ 1) {
				toggle_class(div4, "danger", /*type*/ ctx[8] === 'danger');
			}
		},
		r() {
			rect = div4.getBoundingClientRect();
		},
		f() {
			fix_position(div4);
			stop_animation();
			add_transform(div4, rect);
		},
		a() {
			stop_animation();
			stop_animation = create_animation(div4, rect, flip, {});
		},
		i(local) {
			if (current) return;

			add_render_callback(() => {
				if (!current) return;
				if (!div4_transition) div4_transition = create_bidirectional_transition(div4, blur, { amount: 10 }, true);
				div4_transition.run(1);
			});

			current = true;
		},
		o(local) {
			if (!div4_transition) div4_transition = create_bidirectional_transition(div4, blur, { amount: 10 }, false);
			div4_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div4);

			if (if_block) {
				if_block.d();
			}

			if (detaching && div4_transition) div4_transition.end();
			mounted = false;
			run_all(dispose);
		}
	};
}

function create_fragment$11(ctx) {
	let div;
	let each_blocks = [];
	let each_1_lookup = new Map();
	let current;
	let each_value = /*notifications*/ ctx[0].slice(0, 10);
	const get_key = ctx => /*id*/ ctx[9];

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context$h(ctx, each_value, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block$h(key, child_ctx));
	}

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div, "class", "marcelle notification-container svelte-c58nio");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(div, null);
				}
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (dirty & /*notifications, close*/ 3) {
				each_value = /*notifications*/ ctx[0].slice(0, 10);
				group_outros();
				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, fix_and_outro_and_destroy_block, create_each_block$h, null, get_each_context$h);
				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
				check_outros();
			}
		},
		i(local) {
			if (current) return;

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o(local) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d();
			}
		}
	};
}

function instance$10($$self, $$props, $$invalidate) {
	let { notifications = [] } = $$props;

	function close(id) {
		$$invalidate(0, notifications = notifications.filter(x => x.id !== id));
	}

	let uid = 1;

	function add({ title, message, type = "default", duration = 3e3 }) {
		const n = { id: uid, title, message, type };
		uid += 1;
		$$invalidate(0, notifications = [...notifications, n]);

		if (duration > 0) {
			setTimeout(
				() => {
					close(n.id);
				},
				duration
			);
		}
	}

	const click_handler = id => close(id);
	const keypress_handler = (id, e) => e.key === 'Escape' && close(id);

	$$self.$$set = $$props => {
		if ('notifications' in $$props) $$invalidate(0, notifications = $$props.notifications);
	};

	return [notifications, close, add, click_handler, keypress_handler];
}

class Notification extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$10, create_fragment$11, safe_not_equal, { notifications: 0, add: 2 });
	}

	get add() {
		return this.$$.ctx[2];
	}
}


/* ../design-system/dist/Progress.svelte generated by Svelte v3.58.0 */

function create_fragment$Z(ctx) {
	let div;
	let div_style_value;

	return {
		c() {
			div = element("div");
			attr(div, "class", "progress-line svelte-dee3y");

			attr(div, "style", div_style_value = /*progress*/ ctx[0] >= 0
			? `--bar-mr: ${100 - Math.floor(/*progress*/ ctx[0] * 100)}%;`
			: '--bar-mr: 0px');

			toggle_class(div, "thin", /*thin*/ ctx[2]);
			toggle_class(div, "indeterminate", /*progress*/ ctx[0] === undefined || /*progress*/ ctx[0] === null || /*progress*/ ctx[0] < 0);
			toggle_class(div, "gray", /*type*/ ctx[1] === 'idle');
			toggle_class(div, "green", /*type*/ ctx[1] === 'success');
			toggle_class(div, "red", /*type*/ ctx[1] === 'danger');
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p(ctx, [dirty]) {
			if (dirty & /*progress*/ 1 && div_style_value !== (div_style_value = /*progress*/ ctx[0] >= 0
			? `--bar-mr: ${100 - Math.floor(/*progress*/ ctx[0] * 100)}%;`
			: '--bar-mr: 0px')) {
				attr(div, "style", div_style_value);
			}

			if (dirty & /*thin*/ 4) {
				toggle_class(div, "thin", /*thin*/ ctx[2]);
			}

			if (dirty & /*progress, undefined*/ 1) {
				toggle_class(div, "indeterminate", /*progress*/ ctx[0] === undefined || /*progress*/ ctx[0] === null || /*progress*/ ctx[0] < 0);
			}

			if (dirty & /*type*/ 2) {
				toggle_class(div, "gray", /*type*/ ctx[1] === 'idle');
			}

			if (dirty & /*type*/ 2) {
				toggle_class(div, "green", /*type*/ ctx[1] === 'success');
			}

			if (dirty & /*type*/ 2) {
				toggle_class(div, "red", /*type*/ ctx[1] === 'danger');
			}
		},
		i: noop$1,
		o: noop$1,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

function instance$Y($$self, $$props, $$invalidate) {
	let { progress } = $$props;
	let { type = "default" } = $$props;
	let { thin = false } = $$props;

	$$self.$$set = $$props => {
		if ('progress' in $$props) $$invalidate(0, progress = $$props.progress);
		if ('type' in $$props) $$invalidate(1, type = $$props.type);
		if ('thin' in $$props) $$invalidate(2, thin = $$props.thin);
	};

	return [progress, type, thin];
}

class Progress extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$Y, create_fragment$Z, safe_not_equal, { progress: 0, type: 1, thin: 2 });
	}
}


/* ../design-system/dist/Spinner.svelte generated by Svelte v3.58.0 */

function create_fragment$X(ctx) {
	let span3;

	return {
		c() {
			span3 = element("span");
			span3.innerHTML = `<span class="spinner svelte-zvuq20"><span class="dot1 svelte-zvuq20"></span>  <span class="dot2 svelte-zvuq20"></span></span>`;
			attr(span3, "class", "spinner-container svelte-zvuq20");
		},
		m(target, anchor) {
			insert(target, span3, anchor);
		},
		p: noop$1,
		i: noop$1,
		o: noop$1,
		d(detaching) {
			if (detaching) detach(span3);
		}
	};
}

class Spinner extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, null, create_fragment$X, safe_not_equal, {});
	}
}

/* ../design-system/dist/Tabs.svelte generated by Svelte v3.58.0 */

function create_fragment$V(ctx) {
	let div;
	let current;
	const default_slot_template = /*#slots*/ ctx[1].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

	return {
		c() {
			div = element("div");
			if (default_slot) default_slot.c();
			attr(div, "class", "tabs");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (default_slot) {
				default_slot.m(div, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[0],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

const TABS = {};

function instance$V($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	const tabs = [];
	const panels = [];
	const selectedTab = writable(null);
	const selectedPanel = writable(null);

	setContext(TABS, {
		registerTab: tab => {
			tabs.push(tab);
			selectedTab.update(current => current || tab);

			onDestroy(() => {
				const i = tabs.indexOf(tab);
				tabs.splice(i, 1);

				selectedTab.update(current => current === tab
				? tabs[i] || tabs[tabs.length - 1]
				: current);
			});
		},
		registerPanel: panel => {
			panels.push(panel);
			selectedPanel.update(current => current || panel);

			onDestroy(() => {
				const i = panels.indexOf(panel);
				panels.splice(i, 1);

				selectedPanel.update(current => current === panel
				? panels[i] || panels[panels.length - 1]
				: current);
			});
		},
		selectTab: tab => {
			const i = tabs.indexOf(tab);
			selectedTab.set(tab);
			selectedPanel.set(panels[i]);
		},
		selectedTab,
		selectedPanel
	});

	$$self.$$set = $$props => {
		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
	};

	return [$$scope, slots];
}

class Tabs extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$V, create_fragment$V, safe_not_equal, {});
	}
}

/* ../design-system/dist/Tab.svelte generated by Svelte v3.58.0 */

function create_fragment$U(ctx) {
	let div;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[5].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], null);

	return {
		c() {
			div = element("div");
			if (default_slot) default_slot.c();
			attr(div, "class", "text-sm font-semibold text-gray-600 cursor-pointer mx-4 p-2 hover:text-gray-800 svelte-d0yt2a");
			attr(div, "role", "tab");
			toggle_class(div, "selected", /*$selectedTab*/ ctx[0] === /*tab*/ ctx[1]);
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (default_slot) {
				default_slot.m(div, null);
			}

			current = true;

			if (!mounted) {
				dispose = listen(div, "click", /*click_handler*/ ctx[6]);
				mounted = true;
			}
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 16)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[4],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, null),
						null
					);
				}
			}

			if (!current || dirty & /*$selectedTab, tab*/ 3) {
				toggle_class(div, "selected", /*$selectedTab*/ ctx[0] === /*tab*/ ctx[1]);
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (default_slot) default_slot.d(detaching);
			mounted = false;
			dispose();
		}
	};
}

function instance$U($$self, $$props, $$invalidate) {
	let $selectedTab;
	let { $$slots: slots = {}, $$scope } = $$props;
	const tab = {};
	const { registerTab, selectTab, selectedTab } = getContext(TABS);
	component_subscribe($$self, selectedTab, value => $$invalidate(0, $selectedTab = value));
	registerTab(tab);
	const click_handler = () => selectTab(tab);

	$$self.$$set = $$props => {
		if ('$$scope' in $$props) $$invalidate(4, $$scope = $$props.$$scope);
	};

	return [$selectedTab, tab, selectTab, selectedTab, $$scope, slots, click_handler];
}

class Tab extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$U, create_fragment$U, safe_not_equal, {});
	}
}

/* ../design-system/dist/TabPanel.svelte generated by Svelte v3.58.0 */

function create_if_block$A(ctx) {
	let current;
	const default_slot_template = /*#slots*/ ctx[4].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

	return {
		c() {
			if (default_slot) default_slot.c();
		},
		m(target, anchor) {
			if (default_slot) {
				default_slot.m(target, anchor);
			}

			current = true;
		},
		p(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[3],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function create_fragment$T(ctx) {
	let if_block_anchor;
	let current;
	let if_block = /*$selectedPanel*/ ctx[0] === /*panel*/ ctx[1] && create_if_block$A(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if (/*$selectedPanel*/ ctx[0] === /*panel*/ ctx[1]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*$selectedPanel*/ 1) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$A(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$T($$self, $$props, $$invalidate) {
	let $selectedPanel;
	let { $$slots: slots = {}, $$scope } = $$props;
	const panel = {};
	const { registerPanel, selectedPanel } = getContext(TABS);
	component_subscribe($$self, selectedPanel, value => $$invalidate(0, $selectedPanel = value));
	registerPanel(panel);

	$$self.$$set = $$props => {
		if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
	};

	return [$selectedPanel, panel, selectedPanel, $$scope, slots];
}

class TabPanel extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$T, create_fragment$T, safe_not_equal, {});
	}
}

/* ../design-system/dist/TabList.svelte generated by Svelte v3.58.0 */

function create_fragment$N(ctx) {
	let div;
	let current;
	const default_slot_template = /*#slots*/ ctx[1].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

	return {
		c() {
			div = element("div");
			if (default_slot) default_slot.c();
			attr(div, "class", "flex border-solid border-0 border-b border-gray-200 mb-2");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			if (default_slot) {
				default_slot.m(div, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[0],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance$N($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;

	$$self.$$set = $$props => {
		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
	};

	return [$$scope, slots];
}

class TabList extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$N, create_fragment$N, safe_not_equal, {});
	}
}

const defaultOptions$1 = { itemsPerPage: 10 };
class TableDataProvider {
    options;
    data = writable([]);
    total = writable(0);
    error = writable(null);
    constructor(options = defaultOptions$1) {
        this.options = { ...defaultOptions$1, ...options };
    }
    paginate(n) {
        this.options.itemsPerPage = n;
        this.update();
    }
    async get(i) {
        const data = get_store_value(this.data);
        if (i >= 0 && i < data.length) {
            return data[i];
        }
        return null;
    }
}

class TableArrayProvider extends TableDataProvider {
    rawData;
    currentPage = 1;
    constructor({ data, ...options }) {
        super(options);
        this.rawData = data;
        this.total.set(data.length);
        this.data.set(this.rawData.slice(0, this.options.itemsPerPage));
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    async update() {
        this.page(this.currentPage);
    }
    async page(i) {
        this.data.set(this.rawData.slice((i - 1) * this.options.itemsPerPage, Math.min(i * this.options.itemsPerPage, this.rawData.length)));
        this.currentPage = i;
    }
    async sort(sorting) {
        this.rawData.sort((x, y) => {
            if (x[sorting.col] > y[sorting.col])
                return sorting.ascending ? 1 : -1;
            if (x[sorting.col] < y[sorting.col])
                return sorting.ascending ? -1 : 1;
            return 0;
        });
        this.page(this.currentPage);
    }
    async delete(i) {
        this.rawData.splice(i, 1);
        this.page(this.currentPage);
        return null;
    }
}

class TableServiceProvider extends TableDataProvider {
    service;
    query;
    transform;
    constructor({ service, columns, transform, ...options }) {
        super(options);
        this.service = service;
        this.transform = transform || {};
        this.query = {
            $sort: {
                updatedAt: -1,
            },
            $limit: this.options.itemsPerPage,
        };
        if (columns) {
            this.query.$select = columns.map((x) => x.name).concat(['id']);
        }
        this.update();
        this.service.on('created', this.update.bind(this));
        this.service.on('patched', this.update.bind(this));
        this.service.on('updated', this.update.bind(this));
        this.service.on('removed', this.update.bind(this));
    }
    paginate(n) {
        super.paginate(n);
        this.query.$limit = this.options.itemsPerPage;
        this.update();
    }
    async update() {
        try {
            const res = (await this.service.find({ query: this.query }));
            const data = res.data.map((x, i) => {
                const z = Object.entries(this.transform)
                    .map(([target, f]) => {
                    try {
                        return { [target]: f(x, i) };
                    }
                    catch (error) {
                        return { [target]: 'transform error' };
                    }
                })
                    .reduce((o, y) => ({ ...o, ...y }), {});
                return { ...x, ...z };
            });
            this.data.set(data);
            this.total.set(res.total);
            this.error.set(null);
        }
        catch (error) {
            this.data.set([]);
            this.total.set(0);
            this.error.set(error);
        }
    }
    async page(i) {
        this.query.$skip = (i - 1) * this.query.$limit;
        this.update();
    }
    async sort(sorting) {
        const { col, ascending } = sorting;
        if (col) {
            this.query.$sort = {
                [col]: ascending ? 1 : -1,
            };
        }
        else {
            delete this.query.$sort;
        }
        this.update();
    }
    async delete(i) {
        const removed = get_store_value(this.data)[i];
        await this.service.remove(removed.id);
        this.update();
        return removed;
    }
}

/* ../design-system/dist/ViewContainer.svelte generated by Svelte v3.58.0 */

function create_if_block_1$f(ctx) {
	let div;
	let progress_1;
	let current;

	progress_1 = new Progress({
			props: {
				progress: /*progress*/ ctx[2],
				thin: true
			}
		});

	return {
		c() {
			div = element("div");
			create_component(progress_1.$$.fragment);
			attr(div, "class", "absolute top-0 left-0 right-0");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			mount_component(progress_1, div, null);
			current = true;
		},
		p(ctx, dirty) {
			const progress_1_changes = {};
			if (dirty & /*progress*/ 4) progress_1_changes.progress = /*progress*/ ctx[2];
			progress_1.$set(progress_1_changes);
		},
		i(local) {
			if (current) return;
			transition_in(progress_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(progress_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_component(progress_1);
		}
	};
}

// (15:2) {#if loading}
function create_if_block$u(ctx) {
	let spinner;
	let current;
	spinner = new Spinner({});

	return {
		c() {
			create_component(spinner.$$.fragment);
		},
		m(target, anchor) {
			mount_component(spinner, target, anchor);
			current = true;
		},
		i(local) {
			if (current) return;
			transition_in(spinner.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(spinner.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(spinner, detaching);
		}
	};
}

function create_fragment$M(ctx) {
	let div;
	let t0;
	let span;
	let t1;
	let t2;
	let t3;
	let current;
	let if_block0 = /*progress*/ ctx[2] !== false && create_if_block_1$f(ctx);
	let if_block1 = /*loading*/ ctx[1] && create_if_block$u();
	const default_slot_template = /*#slots*/ ctx[4].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

	return {
		c() {
			div = element("div");
			if (if_block0) if_block0.c();
			t0 = space();
			span = element("span");
			t1 = text$1(/*title*/ ctx[0]);
			t2 = space();
			if (if_block1) if_block1.c();
			t3 = space();
			if (default_slot) default_slot.c();
			attr(span, "class", "card-title");
			attr(div, "class", "card-container svelte-xnhseh");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if (if_block0) if_block0.m(div, null);
			append(div, t0);
			append(div, span);
			append(span, t1);
			append(div, t2);
			if (if_block1) if_block1.m(div, null);
			append(div, t3);

			if (default_slot) {
				default_slot.m(div, null);
			}

			current = true;
		},
		p(ctx, [dirty]) {
			if (/*progress*/ ctx[2] !== false) {
				if (if_block0) {
					if_block0.p(ctx, dirty);

					if (dirty & /*progress*/ 4) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_1$f(ctx);
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(div, t0);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			if (!current || dirty & /*title*/ 1) set_data(t1, /*title*/ ctx[0]);

			if (/*loading*/ ctx[1]) {
				if (if_block1) {
					if (dirty & /*loading*/ 2) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block$u();
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(div, t3);
				}
			} else if (if_block1) {
				group_outros();

				transition_out(if_block1, 1, 1, () => {
					if_block1 = null;
				});

				check_outros();
			}

			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[3],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null),
						null
					);
				}
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block0);
			transition_in(if_block1);
			transition_in(default_slot, local);
			current = true;
		},
		o(local) {
			transition_out(if_block0);
			transition_out(if_block1);
			transition_out(default_slot, local);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			if (default_slot) default_slot.d(detaching);
		}
	};
}

function instance$M($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	let { title } = $$props;
	let { loading = false } = $$props;
	let { progress = false } = $$props;

	$$self.$$set = $$props => {
		if ('title' in $$props) $$invalidate(0, title = $$props.title);
		if ('loading' in $$props) $$invalidate(1, loading = $$props.loading);
		if ('progress' in $$props) $$invalidate(2, progress = $$props.progress);
		if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
	};

	return [title, loading, progress, $$scope, slots];
}

class ViewContainer extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$M, create_fragment$M, safe_not_equal, { title: 0, loading: 1, progress: 2 });
	}
}

let notificationContainer;
let app;
function notification({ title, message, duration = 3000, type = 'default', }) {
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        document.body.appendChild(notificationContainer);
        app = new Notification({
            target: notificationContainer,
        });
    }
    app === null || app === void 0 ? void 0 : app.add({ title, message, duration, type });
}

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}

function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
}

function noop() {
    // Nothing here
}

var _Stream_hold, _Stream_running, _Stream_startPromise;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function dummySubscriber(value) {
    // Do nothing
}
const scheduler = newDefaultScheduler();
function isMostStream(s) {
    return s && typeof s === 'object' && s.run !== undefined;
}
function isStream(s) {
    return (s &&
        typeof s === 'object' &&
        s.run !== undefined &&
        s.id !== undefined);
}
class Stream {
    constructor(s, hold = undefined) {
        this.id = Stream.nextId++;
        this.subscribers = [];
        this.value = undefined;
        this.ready = false;
        _Stream_hold.set(this, void 0);
        _Stream_running.set(this, false);
        _Stream_startPromise.set(this, void 0);
        __classPrivateFieldSet(this, _Stream_hold, !!hold, "f");
        const [stopStream, stopEvents] = createAdapter();
        const [induce, events] = createAdapter();
        this.stopStream = stopStream;
        this.set = (v) => {
            this.value = v;
            // Following line is not working for derived streams...
            // if (!hold || this.ready) induce(v);
            induce(v);
        };
        let stream;
        if (isStream(s)) {
            stream = s;
            if (hold === undefined) {
                __classPrivateFieldSet(this, _Stream_hold, s.holding, "f");
            }
            if (s.holding) {
                this.value = s.value;
            }
        }
        else if (isMostStream(s)) {
            stream = s;
        }
        else {
            stream = most.map(() => this.value, most.now(s));
            this.value = s;
        }
        this.stream = most.multicast(most.tap(this.runListeners.bind(this), most.until(stopEvents, most.merge(stream, events))));
    }
    get() {
        // if (!this.#hold) {
        //   throw new Error('Cannot get value of a Stream if it was not instantiated with hold=true');
        // }
        return this.value;
    }
    get holding() {
        return __classPrivateFieldGet(this, _Stream_hold, "f");
    }
    run(sink, s) {
        return this.stream.run(sink, s);
    }
    runListeners(value) {
        this.value = value;
        for (const listener of this.subscribers) {
            listener(value);
        }
    }
    subscribe(run = dummySubscriber, invalidate = noop) {
        if (__classPrivateFieldGet(this, _Stream_hold, "f") && __classPrivateFieldGet(this, _Stream_running, "f")) {
            run(this.value);
        }
        const subscriber = (x) => {
            invalidate();
            run(x);
        };
        this.subscribers.push(subscriber);
        if (!__classPrivateFieldGet(this, _Stream_running, "f")) {
            this.start();
        }
        return () => {
            const index = this.subscribers.indexOf(subscriber);
            if (index !== -1)
                this.subscribers.splice(index, 1);
        };
    }
    async start() {
        if (!__classPrivateFieldGet(this, _Stream_running, "f")) {
            Stream.numActive++;
            // console.log('active streams: ', Stream.numActive);
            most.runEffects(this.stream, scheduler).then(() => {
                Stream.numActive--;
                // console.log('active streams: ', Stream.numActive);
            });
            __classPrivateFieldSet(this, _Stream_running, true, "f");
            __classPrivateFieldSet(this, _Stream_startPromise, new Promise((resolve, reject) => {
                asap({
                    run: () => {
                        this.ready = true;
                        resolve();
                    },
                    error(e) {
                        reject(e);
                    },
                    dispose() {
                        // nothing here.
                    },
                }, scheduler);
            }), "f");
        }
        return __classPrivateFieldGet(this, _Stream_startPromise, "f");
    }
    stop() {
        this.stopStream(undefined);
        __classPrivateFieldSet(this, _Stream_running, false, "f");
    }
    hold(h = true) {
        __classPrivateFieldSet(this, _Stream_hold, h, "f");
        return this;
    }
    thru(f) {
        return new Stream(f(this));
    }
    // ------------------------------------
    // Wrap most operators
    // ------------------------------------
    startWith(x) {
        const s = new Stream(most.startWith(x, this));
        if (this.holding) {
            s.value = x;
        }
        return s;
    }
    continueWith(f) {
        const s = new Stream(most.continueWith(f, this));
        if (this.holding) {
            s.value = this.value;
        }
        return s;
    }
    map(f) {
        const s = new Stream(most.map(f, this));
        if (this.holding) {
            s.value = f(this.value);
        }
        return s;
    }
    constant(x) {
        const s = new Stream(most.constant(x, this));
        if (this.holding) {
            s.value = x;
        }
        return s;
    }
    tap(f) {
        const s = new Stream(most.tap(f, this));
        if (this.holding) {
            s.value = this.value;
        }
        return s;
    }
    ap(fs) {
        const s = new Stream(most.ap(fs, this));
        if (this.holding && fs.holding) {
            s.value = fs.get()(this.value);
        }
        return s;
    }
    scan(f, initial) {
        const s = new Stream(most.scan(f, initial, this));
        if (this.holding) {
            s.value = initial;
        }
        return s;
    }
    loop(stepper, seed) {
        return new Stream(most.loop(stepper, seed, this));
    }
    withItems(items) {
        return new Stream(most.withItems(items, this));
    }
    zipItems(f, items) {
        return new Stream(most.zipItems(f, items, this));
    }
    switchLatest() {
        return new Stream(most.switchLatest(this));
    }
    join() {
        return new Stream(most.join(this));
    }
    chain(f) {
        return new Stream(most.chain(f, this));
    }
    concatMap(f) {
        return new Stream(most.concatMap(f, this));
    }
    mergeConcurrently(concurrency) {
        return new Stream(most.mergeConcurrently(concurrency, this));
    }
    mergeMapConcurrently(f, concurrency) {
        return new Stream(most.mergeMapConcurrently(f, concurrency, this));
    }
    merge(stream1) {
        const s = new Stream(most.merge(stream1, this));
        if (this.holding) {
            s.value = this.value;
        }
        return s;
    }
    combine(f, stream1) {
        const s = new Stream(most.combine(f, stream1, this));
        if (this.holding) {
            s.value = f(stream1.value, this.value);
        }
        return s;
    }
    zip(f, stream1) {
        const s = new Stream(most.zip(f, stream1, this));
        if (this.holding) {
            s.value = f(stream1.value, this.value);
        }
        return s;
    }
    resample(sampler) {
        return new Stream(most.sample(this, sampler));
    }
    sample(values) {
        return new Stream(most.sample(values, this));
    }
    snapshot(f, values) {
        return new Stream(most.snapshot(f, values, this));
    }
    filter(p) {
        const s = new Stream(most.filter(p, this));
        if (this.holding && p(this.value)) {
            s.value = this.value;
        }
        return s;
    }
    skipRepeats() {
        const s = new Stream(most.skipRepeats(this));
        if (this.holding) {
            s.value = this.value;
        }
        return s;
    }
    skipRepeatsWith(equals) {
        return new Stream(most.skipRepeatsWith(equals, this));
    }
    slice(start, end) {
        return new Stream(most.slice(start, end, this));
    }
    take(n) {
        return new Stream(most.take(n, this));
    }
    skip(n) {
        return new Stream(most.skip(n, this));
    }
    takeWhile(p) {
        return new Stream(most.takeWhile(p, this));
    }
    skipWhile(p) {
        return new Stream(most.skipWhile(p, this));
    }
    skipAfter(p) {
        return new Stream(most.skipAfter(p, this));
    }
    until(endSignal) {
        return new Stream(most.until(endSignal, this));
    }
    since(startSignal) {
        return new Stream(most.since(startSignal, this));
    }
    during(timeWindow) {
        return new Stream(most.during(timeWindow, this));
    }
    delay(delayTime) {
        return new Stream(most.delay(delayTime, this));
    }
    withLocalTime(origin) {
        return new Stream(most.withLocalTime(origin, this));
    }
    throttle(period) {
        return new Stream(most.throttle(period, this));
    }
    debounce(period) {
        return new Stream(most.debounce(period, this));
    }
    awaitPromises() {
        return new Stream(most.awaitPromises(this));
    }
    recoverWith(f) {
        return new Stream(most.recoverWith(f, this));
    }
    static empty() {
        return new Stream(most.empty());
    }
    static never() {
        return new Stream(most.never());
    }
    static now(x) {
        return new Stream(most.now(x));
    }
    static at(t, x) {
        return new Stream(most.at(t, x));
    }
    static periodic(period) {
        return new Stream(most.periodic(period));
    }
    static throwError(e) {
        return new Stream(most.throwError(e));
    }
}
_Stream_hold = new WeakMap(), _Stream_running = new WeakMap(), _Stream_startPromise = new WeakMap();
Stream.nextId = 0;
Stream.numActive = 0;
function createStream(s, hold = false) {
    return new Stream(s, hold);
}

var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["Debug"] = 0] = "Debug";
    LogLevel[LogLevel["Info"] = 1] = "Info";
    LogLevel[LogLevel["Warning"] = 2] = "Warning";
    LogLevel[LogLevel["Error"] = 3] = "Error";
})(LogLevel || (LogLevel = {}));
const $log = new Stream(never());
const logger = {
    log(...messages) {
        // eslint-disable-next-line no-console
        console.log(...messages);
        $log.set([
            LogLevel.Info,
            messages
                .filter((x) => x !== undefined)
                .map((x) => x.toString())
                .join(' '),
        ]);
    },
    debug(...messages) {
        $log.set([
            LogLevel.Debug,
            messages
                .filter((x) => x !== undefined)
                .map((x) => x.toString())
                .join(' '),
        ]);
    },
    info(...messages) {
        this.log(...messages);
    },
    warning(...messages) {
        $log.set([
            LogLevel.Warning,
            messages
                .filter((x) => x !== undefined)
                .map((x) => x.toString())
                .join(' '),
        ]);
    },
    error(...messages) {
        // eslint-disable-next-line no-console
        console.error(...messages);
        $log.set([
            LogLevel.Error,
            messages
                .filter((x) => x !== undefined)
                .map((x) => x.toString())
                .join(' '),
        ]);
    },
};
function getLogStream() {
    return $log;
}

/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */



/* src/layouts/dashboard/DashboardPage.svelte generated by Svelte v3.58.0 */

function isTitle$1(x) {
    return typeof x === 'string';
}
function isComponentArray$1(x) {
    return Array.isArray(x);
}
let DashboardPage$1 = class DashboardPage {
    constructor(name, showSidebar = true) {
        this.name = name;
        this.showSidebar = showSidebar;
        this.components = [];
        this.componentsLeft = [];
    }
    use(...components) {
        this.components = this.components.concat(components);
        return this;
    }
    sidebar(...components) {
        this.componentsLeft = this.componentsLeft.concat(components);
        return this;
    }
    mount() {
        for (const m of this.components) {
            if (isComponentArray$1(m)) {
                for (const n of m) {
                    n.mount();
                }
            }
            else if (!isTitle$1(m)) {
                m.mount();
            }
        }
        for (const m of this.componentsLeft) {
            m.mount();
        }
    }
    destroy() {
        for (const m of this.components) {
            if (isComponentArray$1(m)) {
                for (const n of m) {
                    n.destroy();
                }
            }
            else if (!isTitle$1(m)) {
                m.destroy();
            }
        }
        for (const m of this.componentsLeft) {
            m.destroy();
        }
    }
};

function pathToRegexp(path, keys, sensitive, strict) {
    if (path instanceof RegExp)
        return path;
    if (path instanceof Array)
        path = `(${path.join('|')})`;
    path = path
        .concat(strict ? '' : '/?')
        .replace(/\/\(/g, '(?:/')
        .replace(/\+/g, '__plus__')
        .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g, (_, slash, format, key, capture, optional) => {
        keys.push({ name: key, optional: !!optional });
        slash = slash || '';
        return `${optional ? '' : slash}(?:${optional ? slash : ''}${format || ''}${capture || (format && '([^/.]+?)') || '([^/]+?)'})${optional || ''}`;
    })
        .replace(/([/.])/g, '\\$1')
        .replace(/__plus__/g, '(.+)')
        .replace(/\*/g, '(.*)');
    return new RegExp(`^${path}$`, sensitive ? '' : 'i');
}
class Route {
    constructor(path, name) {
        this.path = path;
        this.name = name;
        this.keys = [];
        this.fns = [];
        this.params = {};
        this.regex = pathToRegexp(this.path, this.keys, false, false);
    }
    addHandler(fn) {
        this.fns.push(fn);
    }
    removeHandler(fn) {
        this.fns = this.fns.filter((f) => fn === f);
    }
    run(params) {
        for (const fn of this.fns) {
            fn.apply(this, params);
        }
    }
    match(path, params) {
        const m = this.regex.exec(path);
        if (!m)
            return false;
        for (let i = 1, len = m.length; i < len; i++) {
            const key = this.keys[i - 1];
            const val = typeof m[i] === 'string' ? decodeURIComponent(m[i]) : m[i];
            if (key) {
                this.params[key.name] = val;
            }
            params.push(val);
        }
        return true;
    }
}
function checkRoute(hash, route) {
    const params = [];
    if (route.match(hash, params)) {
        route.run(params);
        return true;
    }
    return false;
}
class Router {
    constructor() {
        this.map = {};
        this.routes = [];
        this.addListener();
    }
    route(path, fn) {
        const s = path.split(' ');
        const name = s.length === 2 ? s[0] : null;
        path = s.length === 2 ? s[1] : s[0];
        if (!Object.keys(this.map).includes(path)) {
            this.map[path] = new Route(path, name);
            this.routes.push(this.map[path]);
        }
        this.map[path].addHandler(fn);
        this.reload();
    }
    addListener() {
        window.addEventListener('hashchange', this.reload.bind(this), false);
    }
    removeListener() {
        window.removeEventListener('hashchange', this.reload.bind(this));
    }
    reload() {
        const hash = window.location.hash.substring(1);
        for (let i = 0; i < this.routes.length; i++) {
            const route = this.routes[i];
            if (checkRoute(hash, route)) {
                return;
            }
        }
    }
    navigate(path, { silent = false } = {}) {
        if (silent) {
            this.removeListener();
        }
        setTimeout(() => {
            window.location.hash = path;
            if (silent) {
                setTimeout(() => {
                    this.addListener();
                }, 1);
            }
        }, 1);
    }
}

/* src/layouts/dashboard/DashboardPage.svelte generated by Svelte v3.58.0 */

function get_each_context$4(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[1] = list[i];
	return child_ctx;
}

function get_each_context_1$2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[4] = list[i].id;
	return child_ctx;
}

function get_each_context_2$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[4] = list[i].id;
	return child_ctx;
}

// (8:0) {#if dashboard}
function create_if_block$8(ctx) {
	let t;
	let div;
	let if_block = /*dashboard*/ ctx[0].showSidebar && create_if_block_3(ctx);
	let each_value = /*dashboard*/ ctx[0].components;
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
	}

	return {
		c() {
			if (if_block) if_block.c();
			t = space();
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div, "class", "right svelte-15dyumc");
			toggle_class(div, "fullw", !/*dashboard*/ ctx[0].showSidebar);
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, t, anchor);
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(div, null);
				}
			}
		},
		p(ctx, dirty) {
			if (/*dashboard*/ ctx[0].showSidebar) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_3(ctx);
					if_block.c();
					if_block.m(t.parentNode, t);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (dirty & /*dashboard, Array*/ 1) {
				each_value = /*dashboard*/ ctx[0].components;
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$4(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$4(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}

			if (dirty & /*dashboard*/ 1) {
				toggle_class(div, "fullw", !/*dashboard*/ ctx[0].showSidebar);
			}
		},
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(t);
			if (detaching) detach(div);
			destroy_each(each_blocks, detaching);
		}
	};
}

// (9:2) {#if dashboard.showSidebar}
function create_if_block_3(ctx) {
	let div;
	let each_value_2 = /*dashboard*/ ctx[0].componentsLeft;
	let each_blocks = [];

	for (let i = 0; i < each_value_2.length; i += 1) {
		each_blocks[i] = create_each_block_2$1(get_each_context_2$1(ctx, each_value_2, i));
	}

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div, "class", "left svelte-15dyumc");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(div, null);
				}
			}
		},
		p(ctx, dirty) {
			if (dirty & /*dashboard*/ 1) {
				each_value_2 = /*dashboard*/ ctx[0].componentsLeft;
				let i;

				for (i = 0; i < each_value_2.length; i += 1) {
					const child_ctx = get_each_context_2$1(ctx, each_value_2, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block_2$1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value_2.length;
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_each(each_blocks, detaching);
		}
	};
}

// (11:6) {#each dashboard.componentsLeft as { id }}
function create_each_block_2$1(ctx) {
	let div;
	let div_id_value;

	return {
		c() {
			div = element("div");
			attr(div, "id", div_id_value = /*id*/ ctx[4]);
			attr(div, "class", "card");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*dashboard*/ 1 && div_id_value !== (div_id_value = /*id*/ ctx[4])) {
				attr(div, "id", div_id_value);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (26:6) {:else}
function create_else_block$5(ctx) {
	let div;
	let div_id_value;

	return {
		c() {
			div = element("div");
			attr(div, "id", div_id_value = /*m*/ ctx[1].id);
			attr(div, "class", "card");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*dashboard*/ 1 && div_id_value !== (div_id_value = /*m*/ ctx[1].id)) {
				attr(div, "id", div_id_value);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (24:38) 
function create_if_block_2$3(ctx) {
	let h2;
	let t_value = /*m*/ ctx[1] + "";
	let t;

	return {
		c() {
			h2 = element("h2");
			t = text$1(t_value);
			attr(h2, "class", "svelte-15dyumc");
		},
		m(target, anchor) {
			insert(target, h2, anchor);
			append(h2, t);
		},
		p(ctx, dirty) {
			if (dirty & /*dashboard*/ 1 && t_value !== (t_value = /*m*/ ctx[1] + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(h2);
		}
	};
}

// (18:6) {#if Array.isArray(m)}
function create_if_block_1$6(ctx) {
	let div;
	let t;
	let each_value_1 = /*m*/ ctx[1];
	let each_blocks = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
	}

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t = space();
			attr(div, "class", "flex flex-row flex-wrap items-stretch");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(div, null);
				}
			}

			append(div, t);
		},
		p(ctx, dirty) {
			if (dirty & /*dashboard*/ 1) {
				each_value_1 = /*m*/ ctx[1];
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block_1$2(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div, t);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value_1.length;
			}
		},
		d(detaching) {
			if (detaching) detach(div);
			destroy_each(each_blocks, detaching);
		}
	};
}

// (20:10) {#each m as { id }}
function create_each_block_1$2(ctx) {
	let div;
	let div_id_value;

	return {
		c() {
			div = element("div");
			attr(div, "id", div_id_value = /*id*/ ctx[4]);
			attr(div, "class", "card flex-none xl:flex-1 w-full xl:w-auto");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*dashboard*/ 1 && div_id_value !== (div_id_value = /*id*/ ctx[4])) {
				attr(div, "id", div_id_value);
			}
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (17:4) {#each dashboard.components as m}
function create_each_block$4(ctx) {
	let show_if;
	let if_block_anchor;

	function select_block_type(ctx, dirty) {
		if (dirty & /*dashboard*/ 1) show_if = null;
		if (show_if == null) show_if = !!Array.isArray(/*m*/ ctx[1]);
		if (show_if) return create_if_block_1$6;
		if (typeof /*m*/ ctx[1] === 'string') return create_if_block_2$3;
		return create_else_block$5;
	}

	let current_block_type = select_block_type(ctx, -1);
	let if_block = current_block_type(ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (current_block_type === (current_block_type = select_block_type(ctx, dirty)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			}
		},
		d(detaching) {
			if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function create_fragment$a(ctx) {
	let if_block_anchor;
	let if_block = /*dashboard*/ ctx[0] && create_if_block$8(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, [dirty]) {
			if (/*dashboard*/ ctx[0]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block$8(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		i: noop$1,
		o: noop$1,
		d(detaching) {
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function instance$a($$self, $$props, $$invalidate) {
	let { dashboard } = $$props;

	afterUpdate(() => {
		dashboard.mount();
	});

	$$self.$$set = $$props => {
		if ('dashboard' in $$props) $$invalidate(0, dashboard = $$props.dashboard);
	};

	return [dashboard];
}

class DashboardPage extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$a, create_fragment$a, safe_not_equal, { dashboard: 0 });
	}
}

/* src/layouts/dashboard/DashboardHeader.svelte generated by Svelte v3.58.0 */

function get_each_context$2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[8] = list[i][0];
	child_ctx[9] = list[i][1];
	child_ctx[11] = i;
	return child_ctx;
}

// (36:6) {#each Object.entries(items) as [slug, name], index}
function create_each_block$2(ctx) {
	let a;
	let t0_value = /*name*/ ctx[9] + "";
	let t0;
	let t1;
	let a_href_value;

	return {
		c() {
			a = element("a");
			t0 = text$1(t0_value);
			t1 = space();
			attr(a, "href", a_href_value = `#${/*slug*/ ctx[8]}`);
			attr(a, "class", "ml-2 mr-5 flex items-center hover:text-black border-solid border-0 border-b-2 border-transparent svelte-1ut593v");
			toggle_class(a, "active", !/*showSettings*/ ctx[4] && /*current*/ ctx[2] === /*name*/ ctx[9]);
		},
		m(target, anchor) {
			insert(target, a, anchor);
			append(a, t0);
			append(a, t1);
		},
		p(ctx, dirty) {
			if (dirty & /*items*/ 2 && t0_value !== (t0_value = /*name*/ ctx[9] + "")) set_data(t0, t0_value);

			if (dirty & /*items*/ 2 && a_href_value !== (a_href_value = `#${/*slug*/ ctx[8]}`)) {
				attr(a, "href", a_href_value);
			}

			if (dirty & /*showSettings, current, Object, items*/ 22) {
				toggle_class(a, "active", !/*showSettings*/ ctx[4] && /*current*/ ctx[2] === /*name*/ ctx[9]);
			}
		},
		d(detaching) {
			if (detaching) detach(a);
		}
	};
}

// (65:6) {#if closable}
function create_if_block$3(ctx) {
	let button;
	let t;
	let span;
	let current;

	button = new Button$1({
			props: {
				round: true,
				type: "danger",
				$$slots: { default: [create_default_slot$1] },
				$$scope: { ctx }
			}
		});

	button.$on("click", /*quit*/ ctx[5]);

	return {
		c() {
			create_component(button.$$.fragment);
			t = space();
			span = element("span");
			attr(span, "class", "w-1");
		},
		m(target, anchor) {
			mount_component(button, target, anchor);
			insert(target, t, anchor);
			insert(target, span, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const button_changes = {};

			if (dirty & /*$$scope*/ 4096) {
				button_changes.$$scope = { dirty, ctx };
			}

			button.$set(button_changes);
		},
		i(local) {
			if (current) return;
			transition_in(button.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(button.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(button, detaching);
			if (detaching) detach(t);
			if (detaching) detach(span);
		}
	};
}

// (66:8) <Button round type="danger" on:click={quit}>
function create_default_slot$1(ctx) {
	let svg;
	let path;
	let line;

	return {
		c() {
			svg = svg_element("svg");
			path = svg_element("path");
			line = svg_element("line");
			attr(path, "d", "M18.36 6.64a9 9 0 1 1-12.73 0");
			attr(line, "x1", "12");
			attr(line, "y1", "2");
			attr(line, "x2", "12");
			attr(line, "y2", "12");
			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
			attr(svg, "width", "24");
			attr(svg, "height", "24");
			attr(svg, "viewBox", "0 0 24 24");
			attr(svg, "fill", "none");
			attr(svg, "stroke", "currentColor");
			attr(svg, "stroke-width", "2");
			attr(svg, "stroke-linecap", "round");
			attr(svg, "stroke-linejoin", "round");
			attr(svg, "class", "feather feather-power");
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, path);
			append(svg, line);
		},
		p: noop$1,
		d(detaching) {
			if (detaching) detach(svg);
		}
	};
}

function create_fragment$4(ctx) {
	let header;
	let div1;
	let span0;
	let t1;
	let nav;
	let t2;
	let div0;
	let t3;
	let span1;
	let t4;
	let current;
	let each_value = Object.entries(/*items*/ ctx[1]);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
	}

	let if_block = /*closable*/ ctx[3] && create_if_block$3(ctx);

	return {
		c() {
			header = element("header");
			div1 = element("div");
			span0 = element("span");
			t1 = space();
			nav = element("nav");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t2 = space();
			div0 = element("div");
			t3 = space();
			span1 = element("span");
			t4 = space();
			if (if_block) if_block.c();
			attr(span0, "class", "mx-3 text-lg");
			attr(nav, "class", "flex items-stretch justify-start flex-wrap text-base grow");
			attr(span1, "class", "w-1"); 
			attr(div0, "class", "flex items-center");
			attr(div1, "class", "mx-auto flex flex-wrap flex-col md:flex-row items-stretch w-full");
			attr(header, "class", "bg-white text-gray-700 body-font");
		},
		m(target, anchor) {
			insert(target, header, anchor);
			append(header, div1);
			append(div1, t1);
			append(div1, nav);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(nav, null);
				}
			}

			append(div1, t2);
			append(div1, div0);
			append(div0, t3);
			append(div0, span1);
			append(div0, t4);
			if (if_block) if_block.m(div0, null);
			current = true;
		},
		p(ctx, [dirty]) {

			if (dirty & /*Object, items, showSettings, current*/ 22) {
				each_value = Object.entries(/*items*/ ctx[1]);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$2(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$2(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(nav, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}

			if (/*closable*/ ctx[3]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*closable*/ 8) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$3(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(div0, null);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(header);
			destroy_each(each_blocks, detaching);
			if (if_block) if_block.d();
		}
	};
}

function instance$4($$self, $$props, $$invalidate) {
	let { title } = $$props;
	let { items } = $$props;
	let { current } = $$props;
	let { closable } = $$props;
	let { showSettings = false } = $$props;
	const dispatch = createEventDispatcher();

	function quit() {
		setTimeout(
			() => {
				dispatch('quit');
			},
			400
		);
	}

	$$self.$$set = $$props => {
		if ('items' in $$props) $$invalidate(1, items = $$props.items);
		if ('current' in $$props) $$invalidate(2, current = $$props.current);
		if ('closable' in $$props) $$invalidate(3, closable = $$props.closable);
		if ('showSettings' in $$props) $$invalidate(4, showSettings = $$props.showSettings);
	};

	return [title, items, current, closable, showSettings, quit];
}

class DashboardHeader extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
			items: 1,
			current: 2,
			closable: 3,
			showSettings: 4,
			quit: 5
		});
	}

	get quit() {
		return this.$$.ctx[5];
	}
}

/* src/layouts/dashboard/DashboardFooter.svelte generated by Svelte v3.58.0 */

function create_else_block_1(ctx) {
	let t;

	return {
		c() {
			t = text$1(" ");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p: noop$1,
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (14:4) {#if $logStream}
function create_if_block$2(ctx) {
	let if_block_anchor;

	function select_block_type_1(ctx, dirty) {
		if (/*$logStream*/ ctx[1][0] === LogLevel.Warning) return create_if_block_1$1;
		if (/*$logStream*/ ctx[1][0] === LogLevel.Error) return create_if_block_2$1;
		return create_else_block$1;
	}

	let current_block_type = select_block_type_1(ctx);
	let if_block = current_block_type(ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			}
		},
		d(detaching) {
			if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

// (21:6) {:else}
function create_else_block$1(ctx) {
	let t_value = (/*$logStream*/ ctx[1][1] || '') + "";
	let t;

	return {
		c() {
			t = text$1(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*$logStream*/ 2 && t_value !== (t_value = (/*$logStream*/ ctx[1][1] || '') + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (18:49) 
function create_if_block_2$1(ctx) {
	let t0;
	let t1_value = (/*$logStream*/ ctx[1][1] || '') + "";
	let t1;

	return {
		c() {
			t0 = text$1("Err:\n        ");
			t1 = text$1(t1_value);
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*$logStream*/ 2 && t1_value !== (t1_value = (/*$logStream*/ ctx[1][1] || '') + "")) set_data(t1, t1_value);
		},
		d(detaching) {
			if (detaching) detach(t0);
			if (detaching) detach(t1);
		}
	};
}

// (15:6) {#if $logStream[0] === LogLevel.Warning}
function create_if_block_1$1(ctx) {
	let t0;
	let t1_value = (/*$logStream*/ ctx[1][1] || '') + "";
	let t1;

	return {
		c() {
			t0 = text$1("Warn:\n        ");
			t1 = text$1(t1_value);
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*$logStream*/ 2 && t1_value !== (t1_value = (/*$logStream*/ ctx[1][1] || '') + "")) set_data(t1, t1_value);
		},
		d(detaching) {
			if (detaching) detach(t0);
			if (detaching) detach(t1);
		}
	};
}

function create_fragment$3(ctx) {
	let footer;
	let p0;
	let t0;
	let p1;
	let t1;
	let t2;

	function select_block_type(ctx, dirty) {
		if (/*$logStream*/ ctx[1]) return create_if_block$2;
		return create_else_block_1;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	return {
		c() {
			footer = element("footer");
			p0 = element("p");
			if_block.c();
			t0 = space();
			p1 = element("p");
			attr(p0, "class", "console svelte-i04gf3");
			toggle_class(p0, "error", /*$logStream*/ ctx[1] && /*$logStream*/ ctx[1][0] === LogLevel.Error);
			toggle_class(p0, "warning", /*$logStream*/ ctx[1] && /*$logStream*/ ctx[1][0] === LogLevel.Warning);
			attr(p1, "class", "text-sm text-gray-500 sm:ml-4 sm:pl-4 sm:border-gray-200");
			attr(footer, "class", "bg-white text-gray-600 border-t px-5 py-1 flex items-center justify-between flex-col sm:flex-row");
		},
		m(target, anchor) {
			insert(target, footer, anchor);
			if_block.m(p0, null);
		},
		p(ctx, [dirty]) {
			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(p0, null);
				}
			}

			if (dirty & /*$logStream, LogLevel*/ 2) {
				toggle_class(p0, "error", /*$logStream*/ ctx[1] && /*$logStream*/ ctx[1][0] === LogLevel.Error);
			}

			if (dirty & /*$logStream, LogLevel*/ 2) {
				toggle_class(p0, "warning", /*$logStream*/ ctx[1] && /*$logStream*/ ctx[1][0] === LogLevel.Warning);
			}

			if (dirty & /*author*/ 1) set_data(t2, /*author*/ ctx[0]);
		},
		i: noop$1,
		o: noop$1,
		d(detaching) {
			if (detaching) detach(footer);
			if_block.d();
		}
	};
}

function instance$3($$self, $$props, $$invalidate) {
	let $logStream;
	let { author } = $$props;
	const logStream = getLogStream();
	component_subscribe($$self, logStream, value => $$invalidate(1, $logStream = value));

	$$self.$$set = $$props => {
		if ('author' in $$props) $$invalidate(0, author = $$props.author);
	};

	return [author, $logStream, logStream];
}

class DashboardFooter extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$3, create_fragment$3, safe_not_equal, { author: 0 });
	}
}

/* src/layouts/dashboard/Dashboard.svelte generated by Svelte v3.58.0 */

function create_if_block$1(ctx) {
	let div1;
	let div0;
	let dashboardheader;
	let t0;
	let main;
	let current_block_type_index;
	let if_block;
	let t1;
	let dashboardfooter;
	let div0_transition;
	let current;

	dashboardheader = new DashboardHeader({
			props: {
				//title: /*title*/ ctx[0],
				items: /*dashboardSlugs*/ ctx[10].reduce(/*func*/ ctx[12], {}),
				current: /*currentDashboard*/ ctx[9],
				showSettings: /*showSettings*/ ctx[8],
				closable: /*closable*/ ctx[4]
			}
		});

	dashboardheader.$on("quit", /*quit*/ ctx[5]);
	const if_block_creators = [create_if_block_1, create_if_block_2];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*showSettings*/ ctx[8]) return 0;
		if (/*currentDashboard*/ ctx[9]) return 1;
		return -1;
	}

	if (~(current_block_type_index = select_block_type(ctx))) {
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
	}

	dashboardfooter = new DashboardFooter({ props: { author: /*author*/ ctx[1] } });

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			create_component(dashboardheader.$$.fragment);
			t0 = space();
			main = element("main");
			if (if_block) if_block.c();
			t1 = space();
			create_component(dashboardfooter.$$.fragment);
			attr(main, "class", "main-container svelte-1da5cws");
			attr(div0, "class", "app-container svelte-1da5cws");
			attr(div1, "class", "marcelle fixed h-screen w-full max-w-full overflow-y-scroll overflow-x-hidden top-0 left-0 z-50");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);
			mount_component(dashboardheader, div0, null);
			append(div0, t0);
			append(div0, main);

			if (~current_block_type_index) {
				if_blocks[current_block_type_index].m(main, null);
			}

			append(div0, t1);
			mount_component(dashboardfooter, div0, null);
			current = true;
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			const dashboardheader_changes = {};
			if (dirty & /*dashboardSlugs, dashboardNames*/ 1088) dashboardheader_changes.items = /*dashboardSlugs*/ ctx[10].reduce(/*func*/ ctx[12], {});
			if (dirty & /*currentDashboard*/ 512) dashboardheader_changes.current = /*currentDashboard*/ ctx[9];
			if (dirty & /*showSettings*/ 256) dashboardheader_changes.showSettings = /*showSettings*/ ctx[8];
			if (dirty & /*closable*/ 16) dashboardheader_changes.closable = /*closable*/ ctx[4];
			dashboardheader.$set(dashboardheader_changes);
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if (~current_block_type_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				}
			} else {
				if (if_block) {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
				}

				if (~current_block_type_index) {
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(main, null);
				} else {
					if_block = null;
				}
			}

			const dashboardfooter_changes = {};
			if (dirty & /*author*/ 2) dashboardfooter_changes.author = /*author*/ ctx[1];
			dashboardfooter.$set(dashboardfooter_changes);
		},
		i(local) {
			if (current) return;
			transition_in(dashboardheader.$$.fragment, local);
			transition_in(if_block);
			transition_in(dashboardfooter.$$.fragment, local);

			add_render_callback(() => {
				if (!current) return;

				if (!div0_transition) div0_transition = create_bidirectional_transition(
					div0,
					blur,
					{
						amount: 10,
						duration: /*closable*/ ctx[4] ? 400 : 0
					},
					true
				);

				div0_transition.run(1);
			});

			current = true;
		},
		o(local) {
			transition_out(dashboardheader.$$.fragment, local);
			transition_out(if_block);
			transition_out(dashboardfooter.$$.fragment, local);

			if (!div0_transition) div0_transition = create_bidirectional_transition(
				div0,
				blur,
				{
					amount: 10,
					duration: /*closable*/ ctx[4] ? 400 : 0
				},
				false
			);

			div0_transition.run(0);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(div1);
			destroy_component(dashboardheader);

			if (~current_block_type_index) {
				if_blocks[current_block_type_index].d();
			}

			destroy_component(dashboardfooter);
			if (detaching && div0_transition) div0_transition.end();
		}
	};
}

// (94:35) 
function create_if_block_2(ctx) {
	let dashboardpagecomponent;
	let current;

	dashboardpagecomponent = new DashboardPage({
			props: {
				dashboard: /*dashboards*/ ctx[2][/*currentDashboard*/ ctx[9]]
			}
		});

	return {
		c() {
			create_component(dashboardpagecomponent.$$.fragment);
		},
		m(target, anchor) {
			mount_component(dashboardpagecomponent, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const dashboardpagecomponent_changes = {};
			if (dirty & /*dashboards, currentDashboard*/ 516) dashboardpagecomponent_changes.dashboard = /*dashboards*/ ctx[2][/*currentDashboard*/ ctx[9]];
			dashboardpagecomponent.$set(dashboardpagecomponent_changes);
		},
		i(local) {
			if (current) return;
			transition_in(dashboardpagecomponent.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(dashboardpagecomponent.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(dashboardpagecomponent, detaching);
		}
	};
}

// (92:8) {#if showSettings}
function create_if_block_1(ctx) {
	let dashboardsettingscomponent;
	let current;
	dashboardsettingscomponent = new DashboardSettings$1({ props: { settings: /*settings*/ ctx[3] } });

	return {
		c() {
			create_component(dashboardsettingscomponent.$$.fragment);
		},
		m(target, anchor) {
			mount_component(dashboardsettingscomponent, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const dashboardsettingscomponent_changes = {};
			if (dirty & /*settings*/ 8) dashboardsettingscomponent_changes.settings = /*settings*/ ctx[3];
			dashboardsettingscomponent.$set(dashboardsettingscomponent_changes);
		},
		i(local) {
			if (current) return;
			transition_in(dashboardsettingscomponent.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(dashboardsettingscomponent.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(dashboardsettingscomponent, detaching);
		}
	};
}

function create_fragment$2(ctx) {
	let title_value;
	let t;
	let if_block_anchor;
	let current;
	document.title = title_value = /*title*/ ctx[0];
	let if_block = /*showApp*/ ctx[7] && create_if_block$1(ctx);

	return {
		c() {
			t = space();
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			insert(target, t, anchor);
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, [dirty]) {
			if ((!current || dirty & /*title*/ 1) && title_value !== (title_value = /*title*/ ctx[0])) {
				document.title = title_value;
			}

			if (/*showApp*/ ctx[7]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*showApp*/ 128) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$1(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) detach(t);
			if (if_block) if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

function string2slug(str) {
	let s = str.replace(/^\s+|\s+$/g, ''); // trim
	s = s.toLowerCase();

	// remove accents, swap ñ for n, etc
	const from = 'àáäâèéëêìíïîòóöôùúüûñç·/_,:;';

	const to = 'aaaaeeeeiiiioooouuuunc------';

	for (let i = 0, l = from.length; i < l; i++) {
		s = s.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
	}

	s = s.replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-'); // remove invalid chars
	// collapse whitespace and replace by -
	// collapse dashes

	return s;
}

function instance$2($$self, $$props, $$invalidate) {
	let dashboardNames;
	let dashboardSlugs;
	const dispatch = createEventDispatcher();
	let { title } = $$props;
	let { author } = $$props;
	let { dashboards = {} } = $$props;
	let { settings } = $$props;
	let { page } = $$props;
	let { closable } = $$props;
	let showApp = false;

	onMount(() => {
		$$invalidate(7, showApp = true);
	});

	function quit() {
		$$invalidate(7, showApp = false);

		setTimeout(
			() => {
				dispatch('quit');
			},
			400
		);
	}

	let showSettings = false;
	let currentDashboard = Object.keys(dashboards)[0] || undefined;

	// Routing
	onMount(() => {
		try {
			const router = new Router();

			dashboardSlugs.forEach((slug, i) => {
				router.route(slug, () => {
					if (currentDashboard === dashboardNames[i]) return;
					if (currentDashboard) dashboards[currentDashboard].destroy();
					$$invalidate(9, currentDashboard = dashboardNames[i]);
					page.set(slug === '' ? string2slug(dashboardNames[0]) : slug);
				});
			});
		} catch(error) {
			// eslint-disable-next-line no-console
			console.log('Could not enable router', error);
		}
	});

	const func = (o, x, i) => ({ ...o, [x]: dashboardNames[i] });

	$$self.$$set = $$props => {
		if ('title' in $$props) $$invalidate(0, title = $$props.title);
		if ('author' in $$props) $$invalidate(1, author = $$props.author);
		if ('dashboards' in $$props) $$invalidate(2, dashboards = $$props.dashboards);
		if ('settings' in $$props) $$invalidate(3, settings = $$props.settings);
		if ('page' in $$props) $$invalidate(11, page = $$props.page);
		if ('closable' in $$props) $$invalidate(4, closable = $$props.closable);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*dashboards*/ 4) {
			$$invalidate(6, dashboardNames = Object.keys(dashboards));
		}

		if ($$self.$$.dirty & /*dashboardNames*/ 64) {
			$$invalidate(10, dashboardSlugs = [''].concat(dashboardNames.slice(1).map(string2slug)));
		}
	};

	return [
		title,
		author,
		dashboards,
		settings,
		closable,
		quit,
		dashboardNames,
		showApp,
		showSettings,
		currentDashboard,
		dashboardSlugs,
		page,
		func
	];
}

let Dashboard$1 = class Dashboard extends SvelteComponent {
	constructor(options) {
		super();

		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
			author: 1,
			dashboards: 2,
			page: 11,
			closable: 4,
			quit: 5
		});
	}

	get quit() {
		return this.$$.ctx[5];
	}
};


class Dashboard {
    constructor({ title = ' ', author = ' ', closable = false, }) {
        this.panels = {};
        this.$active = new Stream(false, true);
        this.$page = new Stream('', true);
        this.title = title;
        this.author = author;
        this.closable = closable;
    }
    page(name, showSidebar) {
        if (!Object.keys(this.panels).includes(name)) {
            this.panels[name] = new DashboardPage$1(name, showSidebar);
        }
        return this.panels[name];
    }
    show() {
        this.app = new Dashboard$1({
            target: document.body,
            props: {
                dashboards: this.panels,
                page: this.$page,
                closable: this.closable,
            },
        });
        this.$active.set(true);
        this.app.$on('quit', () => {
            var _a;
            this.$active.set(false);
            (_a = this.app) === null || _a === void 0 ? void 0 : _a.$destroy();
            for (const panel of Object.values(this.panels)) {
                panel.destroy();
            }
            this.app = undefined;
        });
    }
    hide() {
        var _a;
        (_a = this.app) === null || _a === void 0 ? void 0 : _a.quit();
    }
}
function dashboard(options) {
    return new Dashboard(options);
}



export { Stream, createStream, dashboard, getLogStream, isStream, notification};
//# sourceMappingURL=marcelle.js.map
