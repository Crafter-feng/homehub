import type { Component } from 'vue';
import { clientRegistry } from './client-registry';
import type {
  StateTransitionDef,
} from './types/client-plugin.types';

/**
 * SlotEntry — a resolved slot component with merged props ready for rendering.
 */
export interface SlotEntry {
  /** The Vue component to render */
  component: Component;
  /** Props to pass to the component */
  props: Record<string, unknown>;
  /** Slot declaration order (for sorting) */
  order: number;
}

/**
 * SlotManager — manages PluginSlot rendering.
 *
 * Responsibilities:
 * 1. Find components registered to named slot positions
 * 2. Resolve ItemType renderComponent to actual Vue components
 * 3. Merge default props + passed props for slot components
 */
class SlotManagerImpl {
  /**
   * Get all components that should be rendered for a given slot name,
   * including both explicit slot declarations and ItemType-driven components.
   *
   * @param slotName - The slot position name (e.g. 'stock:item-detail-extra')
   * @param slotProps - Props passed from the PluginSlot parent
   * @returns Array of SlotEntry objects ready for rendering
   */
  getComponentsForSlot(
    slotName: string,
    slotProps: Record<string, unknown> = {},
  ): SlotEntry[] {
    const entries: SlotEntry[] = [];

    // 1. Collect explicit slot declarations
    const declarations = clientRegistry.getSlotDeclarations(slotName);
    for (const decl of declarations) {
      entries.push({
        component: decl.component,
        props: this.mergeProps(decl.props ?? {}, slotProps),
        order: decl.order ?? 100,
      });
    }

    // 2. For ItemType-related slots, also resolve renderComponent
    const itemType = slotProps.itemType as string | undefined;
    if (itemType && this.isItemTypeSlot(slotName)) {
      const typeComponent = this.getItemTypeComponent(itemType, slotName);
      if (typeComponent) {
        entries.push({
          component: typeComponent,
          props: slotProps,
          order: 0, // ItemType component renders first (most specific)
        });
      }
    }

    // Sort by order (ascending)
    entries.sort((a, b) => a.order - b.order);
    return entries;
  }

  /**
   * Resolve an ItemType's renderComponent to an actual Vue component.
   *
   * Flow:
   * 1. Get ItemTypeFrontendConfig from ClientRegistry
   * 2. Look up config.renderComponent in the component map
   * 3. Return the matched Vue component
   *
   * @param itemType - The item type key (e.g. 'rechargeable_battery')
   * @param slotName - The slot position (used to determine which slot the component belongs to)
   * @returns The Vue component, or null if no mapping exists
   */
  getItemTypeComponent(itemType: string, slotName: string): Component | null {
    const config = clientRegistry.getItemTypeConfig(itemType);
    if (!config || !config.renderComponent) return null;

    // Check that the slot name is appropriate for this renderComponent
    // Only 'stock:item-detail-extra' and similar detail slots use renderComponent
    if (!this.isItemTypeSlot(slotName)) return null;

    const component = clientRegistry.resolveComponent(config.renderComponent);
    return component;
  }

  /**
   * Merge default props from slot declarations with props passed from the parent.
   * Parent props override default props.
   *
   * @param defaultProps - Default props from the PluginSlotDeclaration
   * @param passedProps - Props passed from the PluginSlot parent component
   * @returns Merged props object
   */
  mergeProps(
    defaultProps: Record<string, unknown>,
    passedProps: Record<string, unknown>,
  ): Record<string, unknown> {
    return { ...defaultProps, ...passedProps };
  }

  /**
   * Get the ItemType config for a given item type, enriched with
   * available transitions from the current state.
   *
   * @param itemType - The item type key
   * @param currentState - The item's current state machine state
   * @returns Available transitions from the current state
   */
  getAvailableTransitions(
    itemType: string,
    currentState: string | null,
  ): StateTransitionDef[] {
    const config = clientRegistry.getItemTypeConfig(itemType);
    if (!config || !config.stateMachine || !currentState) return [];

    return config.stateMachine.transitions.filter(
      (t) => t.from === currentState,
    );
  }

  /**
   * Check if a slot name is an ItemType-related slot.
   * ItemType components are rendered in slots that contain 'item-detail' or 'item-actions'.
   */
  private isItemTypeSlot(slotName: string): boolean {
    return slotName.startsWith('stock:item-');
  }
}

// Singleton instance
export const slotManager = new SlotManagerImpl();
