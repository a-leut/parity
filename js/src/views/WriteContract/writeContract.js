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

import React, { PropTypes, Component } from 'react';
import { observer } from 'mobx-react';
import { MenuItem, Toggle } from 'material-ui';
import { connect } from 'react-redux';
import CircularProgress from 'material-ui/CircularProgress';
import moment from 'moment';
import { throttle } from 'lodash';

import ContentClear from 'material-ui/svg-icons/content/clear';
import SaveIcon from 'material-ui/svg-icons/content/save';
import ListIcon from 'material-ui/svg-icons/action/view-list';
import SettingsIcon from 'material-ui/svg-icons/action/settings';
import SendIcon from 'material-ui/svg-icons/content/send';

import { Actionbar, ActionbarExport, ActionbarImport, Button, Page, Select, Input } from '~/ui';
import Editor from '~/ui/Editor';
import { DeployContract, SaveContract, LoadContract } from '~/modals';

import WriteContractStore from './writeContractStore';
import styles from './writeContract.css';

@observer
class WriteContract extends Component {
  static propTypes = {
    accounts: PropTypes.object.isRequired,
    worker: PropTypes.object,
    workerError: PropTypes.any
  };

  store = WriteContractStore.get();

  state = {
    resizing: false,
    size: 65
  };

  componentWillMount () {
    const { worker } = this.props;

    if (worker !== undefined) {
      this.store.setWorker(worker);
    }

    this.throttledResize = throttle(this.applyResize, 100, { leading: true });
  }

  componentDidMount () {
    this.store.setEditor(this.refs.editor);

    if (this.props.workerError) {
      this.store.setWorkerError(this.props.workerError);
    }

    // Wait for editor to be loaded
    window.setTimeout(() => {
      this.store.resizeEditor();
    }, 2000);
  }

  // Set the worker if not set before (eg. first page loading)
  componentWillReceiveProps (nextProps) {
    if (this.props.worker === undefined && nextProps.worker !== undefined) {
      this.store.setWorker(nextProps.worker);
    }

    if (this.props.workerError !== nextProps.workerError) {
      this.store.setWorkerError(nextProps.workerError);
    }
  }

  render () {
    const { sourcecode } = this.store;
    const { size, resizing } = this.state;

    const annotations = this.store.annotations
      .slice()
      .filter((a) => a.contract === '');

    return (
      <div className={ styles.outer }>
        { this.renderDeployModal() }
        { this.renderSaveModal() }
        { this.renderLoadModal() }

        { this.renderActionBar() }
        <Page className={ styles.page }>
          <div
            className={ `${styles.container} ${resizing ? styles.resizing : ''}` }
            onMouseMove={ this.handleResize }
            onMouseUp={ this.handleStopResize }
            onMouseLeave={ this.handleStopResize }
          >
            <div
              className={ styles.editor }
              style={ { flex: `${size}%` } }
            >
              <h2>{ this.renderTitle() }</h2>

              <Editor
                ref='editor'
                onChange={ this.store.handleEditSourcecode }
                onExecute={ this.store.handleCompile }
                annotations={ annotations }
                value={ sourcecode }
                className={ styles.mainEditor }
              />
            </div>

            <div className={ styles.sliderContainer }>
              <span
                className={ styles.slider }
                onMouseDown={ this.handleStartResize }
              />
            </div>

            <div
              className={ styles.parameters }
              style={ { flex: `${100 - size}%` } }
            >
              <h2>Parameters</h2>
              { this.renderParameters() }
            </div>
          </div>
        </Page>
      </div>
    );
  }

  renderTitle () {
    const { selectedContract } = this.store;

    if (!selectedContract || !selectedContract.name) {
      return 'New Solidity Contract';
    }

    return (
      <span>
        { selectedContract.name }
        <span
          className={ styles.timestamp }
          title={ `saved @ ${(new Date(selectedContract.timestamp)).toISOString()}` }
        >
          (saved { moment(selectedContract.timestamp).fromNow() })
        </span>
      </span>
    );
  }

  renderActionBar () {
    const { sourcecode, selectedContract } = this.store;

    const filename = selectedContract && selectedContract.name
      ? selectedContract.name
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/-$/, '')
        .toLowerCase()
      : 'contract.sol';

    const extension = /\.sol$/.test(filename) ? '' : '.sol';

    const buttons = [
      <Button
        icon={ <ContentClear /> }
        label='New'
        key='newContract'
        onClick={ this.store.handleNewContract }
      />,
      <Button
        icon={ <ListIcon /> }
        label='Load'
        key='loadContract'
        onClick={ this.store.handleOpenLoadModal }
      />,
      <Button
        icon={ <SaveIcon /> }
        label='Save'
        key='saveContract'
        onClick={ this.store.handleSaveContract }
      />,
      <ActionbarExport
        key='exportSourcecode'
        content={ sourcecode }
        filename={ `${filename}${extension}` }
      />,
      <ActionbarImport
        key='importSourcecode'
        title='Import Solidity code'
        onConfirm={ this.store.handleImport }
        renderValidation={ this.renderImportValidation }
      />
    ];

    return (
      <Actionbar
        title='Write a Contract'
        buttons={ buttons }
      />
    );
  }

  renderImportValidation = (content) => {
    return (
      <Editor
        readOnly
        value={ content }
        maxLines={ 20 }
      />
    );
  }

  renderParameters () {
    const { compiling, contract, selectedBuild, loading, workerError } = this.store;

    if (workerError) {
      return (
        <div className={ styles.panel }>
          <div className={ styles.centeredMessage }>
            <p>Unfortuantely, an error occurred...</p>
            <div className={ styles.error }>{ workerError.toString() }</div>
          </div>
        </div>
      );
    }

    if (selectedBuild < 0) {
      return (
        <div className={ `${styles.panel} ${styles.centeredMessage}` }>
          <CircularProgress
            size={ 80 }
            thickness={ 5 }
          />
          <p>Loading...</p>
        </div>
      );
    }

    if (loading) {
      const { longVersion } = this.store.builds[selectedBuild];

      return (
        <div className={ styles.panel }>
          <div className={ styles.centeredMessage }>
            <CircularProgress
              size={ 80 }
              thickness={ 5 }
            />
            <p>Loading Solidity { longVersion }</p>
          </div>
        </div>
      );
    }

    return (
      <div className={ styles.panel }>
        <div>
          <Button
            icon={ <SettingsIcon /> }
            label='Compile'
            onClick={ this.store.handleCompile }
            primary={ false }
            disabled={ compiling }
          />
          {
            contract
              ? (
                <Button
                  icon={ <SendIcon /> }
                  label='Deploy'
                  onClick={ this.store.handleOpenDeployModal }
                  primary={ false }
                />
              )
              : null
          }
        </div>
        <div className={ styles.toggles }>
          <div>
            <Toggle
              label='Optimize'
              labelPosition='right'
              onToggle={ this.store.handleOptimizeToggle }
              toggled={ this.store.optimize }
            />
          </div>
          <div>
            <Toggle
              label='Auto-Compile'
              labelPosition='right'
              onToggle={ this.store.handleAutocompileToggle }
              toggled={ this.store.autocompile }
            />
          </div>
        </div>
        { this.renderSolidityVersions() }
        { this.renderCompilation() }
      </div>
    );
  }

  renderSolidityVersions () {
    const { builds, selectedBuild } = this.store;

    const buildsList = builds.map((build, index) => (
      <MenuItem
        key={ index }
        value={ index }
        label={ build.release ? build.version : build.longVersion }
      >
        {
          build.release
            ? (<span className={ styles.big }>{ build.version }</span>)
            : build.longVersion
        }
      </MenuItem>
    ));

    return (
      <div>
        <Select
          label='Select a Solidity version'
          value={ selectedBuild }
          onChange={ this.store.handleSelectBuild }
        >
          { buildsList }
        </Select>
      </div>
    );
  }

  renderDeployModal () {
    const { showDeployModal, contract, sourcecode } = this.store;

    if (!showDeployModal) {
      return null;
    }

    return (
      <DeployContract
        abi={ contract.interface }
        code={ `0x${contract.bytecode}` }
        source={ sourcecode }
        accounts={ this.props.accounts }
        onClose={ this.store.handleCloseDeployModal }
        readOnly
      />
    );
  }

  renderLoadModal () {
    const { showLoadModal } = this.store;

    if (!showLoadModal) {
      return null;
    }

    return (
      <LoadContract
        onLoad={ this.store.handleLoadContract }
        onDelete={ this.store.handleDeleteContract }
        onClose={ this.store.handleCloseLoadModal }
        contracts={ this.store.savedContracts }
        snippets={ this.store.snippets }
      />
    );
  }

  renderSaveModal () {
    const { showSaveModal, sourcecode } = this.store;

    if (!showSaveModal) {
      return null;
    }

    return (
      <SaveContract
        sourcecode={ sourcecode }
        onSave={ this.store.handleSaveNewContract }
        onClose={ this.store.handleCloseSaveModal }
      />
    );
  }

  renderCompilation () {
    const { compiled, contracts, compiling, contractIndex, contract } = this.store;

    if (compiling) {
      return (
        <div className={ styles.centeredMessage }>
          <CircularProgress
            size={ 80 }
            thickness={ 5 }
          />
          <p>Compiling...</p>
        </div>
      );
    }

    if (!compiled) {
      return (
        <div className={ styles.centeredMessage }>
          <p>Please compile the source code.</p>
        </div>
      );
    }

    if (!contracts) {
      return this.renderErrors();
    }

    const contractKeys = Object.keys(contracts);

    if (contractKeys.length === 0) {
      return (
        <div className={ styles.centeredMessage }>
          <p>No contract has been found.</p>
        </div>
      );
    }

    const contractsList = contractKeys.map((name, index) => (
      <MenuItem
        key={ index }
        value={ index }
        label={ name }
      >
        { name }
      </MenuItem>
    ));

    return (
      <div className={ styles.compilation }>
        <Select
          label='Select a contract'
          value={ contractIndex }
          onChange={ this.store.handleSelectContract }
        >
          { contractsList }
        </Select>
        { this.renderContract(contract) }

        <h4 className={ styles.messagesHeader }>Compiler messages</h4>
        { this.renderErrors() }
      </div>
    );
  }

  renderContract (contract) {
    const { bytecode } = contract;
    const abi = contract.interface;

    const metadata = contract.metadata
      ? (
        <Input
          allowCopy
          label='Metadata'
          readOnly
          value={ contract.metadata }
        />
      )
      : null;

    return (
      <div>
        <Input
          allowCopy
          label='ABI Interface'
          readOnly
          value={ abi }
        />

        <Input
          allowCopy
          label='Bytecode'
          readOnly
          value={ `0x${bytecode}` }
        />

        { metadata }
        { this.renderSwarmHash(contract) }
      </div>
    );
  }

  renderSwarmHash (contract) {
    if (!contract || !contract.metadata) {
      return null;
    }

    const { bytecode } = contract;

    // @see https://solidity.readthedocs.io/en/develop/miscellaneous.html#encoding-of-the-metadata-hash-in-the-bytecode
    const hashRegex = /a165627a7a72305820([a-f0-9]{64})0029$/;

    if (!hashRegex.test(bytecode)) {
      return null;
    }

    const hash = hashRegex.exec(bytecode)[1];

    return (
      <Input
        allowCopy
        label='Swarm Metadata Hash'
        readOnly
        value={ `${hash}` }
      />
    );
  }

  renderErrors () {
    const { annotations } = this.store;

    const body = annotations.map((annotation, index) => {
      const { text, row, column, contract, type, formal } = annotation;
      const classType = formal ? 'formal' : type;
      const classes = [ styles.message, styles[classType] ];

      return (
        <div key={ index } className={ styles.messageContainer }>
          <div className={ classes.join(' ') }>{ text }</div>
          <span className={ styles.errorPosition }>
            { contract ? `[ ${contract} ]   ` : '' }
            { row }: { column }
          </span>
        </div>
      );
    });

    return (
      <div className={ styles.errors }>
        { body }
      </div>
    );
  }

  handleStartResize = () => {
    this.setState({ resizing: true });
  }

  handleStopResize = () => {
    this.setState({ resizing: false });
  }

  handleResize = (event) => {
    if (!this.state.resizing) {
      return;
    }

    const { pageX, currentTarget } = event;
    const { width, left } = currentTarget.getBoundingClientRect();

    const x = pageX - left;

    this.size = 100 * x / width;
    this.throttledResize();

    event.stopPropagation();
  }

  applyResize = () => {
    this.setState({ size: this.size });
  }
}

function mapStateToProps (state) {
  const { accounts } = state.personal;
  const { worker, error } = state.worker;

  return {
    accounts,
    worker,
    workerError: error
  };
}

export default connect(
  mapStateToProps,
  null
)(WriteContract);
