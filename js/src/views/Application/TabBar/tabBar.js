// Copyright 2015-2017 Parity Technologies (UK) Ltd.
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

import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router';
import { Toolbar, ToolbarGroup } from 'material-ui/Toolbar';
import { isEqual } from 'lodash';

import imagesEthcoreBlock from '~/../assets/images/parity-logo-white-no-text.svg';
import { Tooltip } from '~/ui';

import Tab from './Tab';
import styles from './tabBar.css';

class TabBar extends Component {
  static propTypes = {
    isTest: PropTypes.bool,
    netChain: PropTypes.string,
    pending: PropTypes.array,
    views: PropTypes.array.isRequired
  };

  static defaultProps = {
    pending: []
  };

  render () {
    return (
      <Toolbar className={ styles.toolbar }>
        { this.renderLogo() }
        { this.renderTabs() }
        { this.renderLast() }
      </Toolbar>
    );
  }

  renderLogo () {
    return (
      <ToolbarGroup>
        <div className={ styles.logo }>
          <img
            height={ 28 }
            src={ imagesEthcoreBlock }
          />
        </div>
      </ToolbarGroup>
    );
  }

  renderLast () {
    return (
      <ToolbarGroup>
        <div className={ styles.last }>
          <div />
        </div>
      </ToolbarGroup>
    );
  }

  renderTabs () {
    const { views, pending } = this.props;

    const items = views
      .map((view, index) => {
        const body = (view.id === 'accounts')
          ? (
            <Tooltip
              className={ styles.tabbarTooltip }
              text='navigate between the different parts and views of the application, switching between an account view, token view and distributed application view'
            />
          )
          : null;

        return (
          <Link
            activeClassName={ styles.tabactive }
            className={ styles.tabLink }
            key={ view.id }
            to={ view.route }
          >
            <Tab
              pendings={ pending.length }
              view={ view }
            >
              { body }
            </Tab>
          </Link>
        );
      });

    return (
      <div className={ styles.tabs }>
        { items }
      </div>
    );
  }
}

function mapStateToProps (initState) {
  const { views } = initState.settings;

  let filteredViewIds = Object
    .keys(views)
    .filter((id) => views[id].fixed || views[id].active);

  let filteredViews = filteredViewIds.map((id) => ({
    ...views[id],
    id
  }));

  return (state) => {
    const { views } = state.settings;

    const viewIds = Object
      .keys(views)
      .filter((id) => views[id].fixed || views[id].active);

    if (isEqual(viewIds, filteredViewIds)) {
      return { views: filteredViews };
    }

    filteredViewIds = viewIds;
    filteredViews = viewIds.map((id) => ({
      ...views[id],
      id
    }));

    return { views: filteredViews };
  };
}

export default connect(
  mapStateToProps,
  null
)(TabBar);
