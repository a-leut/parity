// Copyright 2015, 2016 Parity Technologies (UK) Ltd.
// This file is part of Parity.

// Parity is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Parity is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Parity.  If not, see <http://www.gnu.org/licenses/>.

import { observer } from 'mobx-react';
import moment from 'moment';
import React, { Component } from 'react';
import { FormattedMessage } from 'react-intl';

import Store from './store';
import styles from './home.css';

@observer
export default class Home extends Component {
  store = Store.get();

  render () {
    const { url } = this.store;

    return (
      <div className={ styles.body }>
        <div className={ styles.url }>
          <input value={ url } />
        </div>
        { this.renderUrlHistory() }
      </div>
    );
  }

  renderUrlHistory () {
    const { urlhistory } = this.store;

    if (!urlhistory.length) {
      return null;
    }

    const rows = urlhistory.map((history) => {
      return (
        <tr>
          <td className={ styles.timestamp }>
            { moment(history.timestamp).fromNow() }
          </td>
          <td className={ styles.url }>
            { history.url }
          </td>
        </tr>
      );
    });

    return (
      <div className={ styles.history }>
        <h3>
          <FormattedMessage
            id='home.url.recent'
            defaultMessage='Recently opened URLs'
          />
        </h3>
        <table>
          <tbody>
            { rows }
          </tbody>
        </table>
      </div>
    );
  }
}