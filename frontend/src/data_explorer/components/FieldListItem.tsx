import React, {PureComponent, MouseEvent} from 'react'
import classnames from 'classnames'
import _ from 'lodash'

import FunctionSelector from 'src/shared/components/FunctionSelector'
import {firstFieldName} from 'src/shared/reducers/helpers/fields'
import {ErrorHandling} from 'src/shared/decorators/errors'

import {ApplyFuncsToFieldArgs, Field, FieldFunc, FuncArg} from 'src/types'

interface Props {
  fieldFuncs: FieldFunc[]
  isSelected: boolean
  onToggleField: (field: Field) => void
  onApplyFuncsToField: (args: ApplyFuncsToFieldArgs) => void
  isKapacitorRule: boolean
  funcs: string[]
  isDisabled: boolean
}

interface State {
  isOpen: boolean
  isActive: boolean
}

@ErrorHandling
class FieldListItem extends PureComponent<Props, State> {
  constructor(props) {
    super(props)

    this.state = {
      isOpen: false,
      isActive: false,
    }
  }

  public render() {
    const {isKapacitorRule, isSelected, funcs, isDisabled} = this.props
    const {isOpen} = this.state
    const fieldName = this.getFieldName()

    let fieldFuncsLabel
    const num = funcs.length
    switch (num) {
      case 0:
        fieldFuncsLabel = '0 Functions'
        break
      case 1:
        fieldFuncsLabel = `${num} Function`
        break
      default:
        fieldFuncsLabel = `${num} Functions`
        break
    }
    return (
      <div>
        <div
          className={classnames('query-builder--list-item', {
            active: isSelected,
            disabled: isDisabled,
          })}
          onClick={this.handleToggleField}
          onMouseEnter={this.handleHover}
          onMouseLeave={this.handleStopHover}
          data-test={`query-builder-list-item-field-${fieldName}`}
        >
          <span>
            <div className="query-builder--checkbox" />
            {fieldName} {this.helperText}
          </span>

          {isSelected ? (
            <div
              className={classnames('btn btn-xs', {
                active: isOpen,
                'btn-default': !num,
                'btn-primary': num,
                disabled: isDisabled,
              })}
              onClick={this.toggleFunctionsMenu}
              data-test={`query-builder-list-item-function-${fieldName}`}
            >
              {fieldFuncsLabel}
            </div>
          ) : null}
        </div>
        {isSelected && isOpen ? (
          <FunctionSelector
            onApply={this.handleApplyFunctions}
            selectedItems={funcs}
            singleSelect={isKapacitorRule}
          />
        ) : null}
      </div>
    )
  }

  private get helperText(): JSX.Element {
    if (this.state.isActive) {
      return (
        <dd className="query-builder--list-item--helper">
          {this.getFieldDesc()}
        </dd>
      )
    }
  }

  private toggleFunctionsMenu = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    const {isDisabled} = this.props
    if (isDisabled) {
      return
    }

    this.setState({isOpen: !this.state.isOpen})
  }

  private close = (): void => {
    this.setState({isOpen: false})
  }

  private handleHover = () => {
    this.setState({isActive: true})
  }

  private handleStopHover = () => {
    this.setState({isActive: false})
  }

  private handleToggleField = (): void => {
    const {onToggleField} = this.props
    const value = this.getFieldName()

    onToggleField({value, type: 'field'})
    this.close()
  }

  private handleApplyFunctions = (selectedFuncs: string[]) => {
    const {onApplyFuncsToField} = this.props
    const fieldName = this.getFieldName()
    const field: Field = {value: fieldName, type: 'field'}

    onApplyFuncsToField({
      field,
      funcs: selectedFuncs.map(val => this.makeFuncArg(val)),
    })
    this.close()
  }

  private makeFuncArg = (value: string): FuncArg => ({
    value,
    type: 'func',
  })

  private getFieldName = (): string => {
    const {fieldFuncs} = this.props
    const fieldFunc = _.head(fieldFuncs)

    return _.get(fieldFunc, 'type') === 'field'
      ? _.get(fieldFunc, 'value')
      : firstFieldName(_.get(fieldFunc, 'args'))
  }

  private getFieldDesc = (): string => {
    const {fieldFuncs} = this.props
    const fieldFunc = _.head(fieldFuncs)

    return _.get(fieldFunc, 'desc')
  }
}

export default FieldListItem
