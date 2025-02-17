// Copyright 2024 Proyectos y Sistemas de Mantenimiento SL (eProsima).
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
		a.style.display = 'none';
	}

	mount(target) {
		const t =  target||document.querySelector('main');
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
			document.querySelector("div[class='card-container svelte-jdleo9']").style.display = 'flex';
			}
		}
	}
