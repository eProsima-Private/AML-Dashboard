import { Component, Stream } from '@marcellejs/core';
import View from './widget.view.svelte';

export class Widget extends Component {
	constructor(options = {}) {
		super();
		this.title = '';
		this.url = new Stream(options.url || '', true);  // Accept a URL option to embed the webpage
		this.view=null;
		this.id='iframe';
	}

	destroy() {
		const a = document.querySelector("div[class='card-container svelte-jdleo9']");
		if (a !== null){
		a.style.display = 'none';
		console.log('destroying widget');
	    }
	}

	mount(target) {
		console.log('mounting widget');
		console.log(this.view===null);
		const t =  target||document.querySelector('main');
		console.log(t);
		if (!t) return;
		if (this.view === null) {
			this.view = new View({
				target: t,
				props: {
					title: this.title,
					url: 'index1.html'  // Pass URL to the view
				}
			});
		} else {
			const b=document.querySelector("div[class='card-container svelte-jdleo9']");
			if (b !== null){
				document.querySelector("div[class='card-container svelte-jdleo9']").style.display = 'flex';
				console.log('showing widget');
			}else {
				this.view = new View({
					target: t,
					props: {
						title: this.title,
						url: 'index1.html'  // Pass URL to the view
					}
				});
			}
		}
	}
}
