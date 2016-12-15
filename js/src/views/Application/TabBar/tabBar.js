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

import React, { Component, PropTypes } from 'react';
import { FormattedMessage } from 'react-intl';
import { connect } from 'react-redux';
import { Link } from 'react-router';
import { Toolbar, ToolbarGroup } from 'material-ui/Toolbar';
import { Tab as MUITab } from 'material-ui/Tabs';
import { isEqual } from 'lodash';

import { Badge, Tooltip } from '~/ui';

import imagesEthcoreBlock from '~/../assets/images/parity-logo-white-no-text.svg';

import styles from './tabBar.css';

class Tab extends Component {
  static propTypes = {
    pendings: PropTypes.number,
    view: PropTypes.object
  };

  shouldComponentUpdate (nextProps) {
    return !isEqual(this.props.pendings !== nextProps.pending);
  }

  render () {
    const { view } = this.props;

    return (
      <Link
        activeClassName={ styles.tabactive }
        className={ styles.tabLink }
        to={ view.route }
      >
        <MUITab
          icon={ view.icon }
          label={ this.renderLabel(view.id) }
        >
          { this.renderBody(view) }
        </MUITab>
      </Link>
    );
  }

  renderBody (view) {
    if (view.id !== 'accounts') {
      return null;
    }

    return (
      <Tooltip
        className={ styles.tabbarTooltip }
        text='navigate between the different parts and views of the application, switching between an account view, token view and distributed application view' />
    );
  }

  renderLabelBody (id, bubble) {
    return (
      <div className={ styles.label }>
        <FormattedMessage
          id={ `settings.views.${id}.label` } />
        { bubble }
      </div>
    );
  }

  renderLabel (id) {
    const { pendings } = this.props;

    if (!pendings) {
      return this.renderLabelBody(id);
    }

    const bubble = (
      <Badge
        color='red'
        className={ styles.labelBubble }
        value={ pendings } />
    );

    return this.renderLabelBody(id, bubble);
  }
}

class TabBar extends Component {
  static contextTypes = {
    router: PropTypes.object.isRequired
  };

  static propTypes = {
    isTest: PropTypes.bool,
    netChain: PropTypes.string,
    pendings: PropTypes.number,
    views: PropTypes.array.isRequired
  };

  static defaultProps = {
    pendings: 0
  };

  shouldComponentUpdate (nextProps) {
    const nextViews = nextProps.views.map((v) => v.id).sort();
    const prevViews = this.props.views.map((v) => v.id).sort();

    if (!isEqual(nextViews, prevViews)) {
      return true;
    }

    return this.props.pendings !== nextProps.pendings;
  }

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
          <img src={ imagesEthcoreBlock } height={ 28 } />
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
    const { views, pendings } = this.props;

    const items = views
      .map((view, index) => {
        return (
          <Tab
            key={ view.id }
            pendings={ view.id === 'signer' ? pendings : null }
            view={ view }
          />
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
  mapStateToProps
)(TabBar);
